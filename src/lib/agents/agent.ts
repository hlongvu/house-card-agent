import { ZodSchema } from "zod";
import { AgentHooks, RunContext, NoOpHooks, LLMUsage } from "./hooks";
import {
  InputGuardrail,
  OutputGuardrail,
  runGuardrails,
  GuardrailResult,
} from "./guardrails";
import { tracer, Span, Trace } from "./tracing";

/**
 * Agent configuration — mirrors OpenAI Agents SDK Agent class.
 */
export interface AgentConfig<
  TInput = unknown,
  TOutput = unknown,
  TContext = unknown
> {
  /** Unique agent name */
  name: string;

  /** Description shown in handoff/tool listings */
  description?: string;

  /** System instructions for the LLM */
  instructions: string;

  /** Zod schema for structured output validation */
  outputSchema?: ZodSchema<TOutput>;

  /** Input guardrails run before the agent executes */
  inputGuardrails?: Array<InputGuardrail<TInput>>;

  /** Output guardrails run after the agent executes */
  outputGuardrails?: Array<OutputGuardrail<TOutput>>;

  /** Lifecycle hooks */
  hooks?: AgentHooks<TContext, TInput, TOutput>;

  /** Agent implementation: takes input, returns output */
  execute: (
    input: TInput,
    context: RunContext<TContext>,
    hooks: AgentHooks<TContext, TInput, TOutput>
  ) => Promise<TOutput>;
}

/**
 * Agent — the core building block following OpenAI Agents SDK pattern.
 *
 * An agent = LLM configured with instructions, tools, outputSchema,
 * guardrails, and lifecycle hooks. It can be run standalone, chained,
 * or used as a tool by a manager.
 */
export class Agent<TInput = unknown, TOutput = unknown, TContext = unknown> {
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly outputSchema?: ZodSchema<TOutput>;
  readonly inputGuardrails: Array<InputGuardrail<TInput>>;
  readonly outputGuardrails: Array<OutputGuardrail<TOutput>>;
  readonly hooks: AgentHooks<TContext, TInput, TOutput>;
  readonly execute: AgentConfig<TInput, TOutput, TContext>["execute"];

  constructor(config: AgentConfig<TInput, TOutput, TContext>) {
    this.name = config.name;
    this.description = config.description || config.name;
    this.instructions = config.instructions;
    this.outputSchema = config.outputSchema;
    this.inputGuardrails = config.inputGuardrails || [];
    this.outputGuardrails = config.outputGuardrails || [];
    this.hooks = config.hooks || NoOpHooks;
    this.execute = config.execute;
  }

  /**
   * Run the agent with the given input and context.
   * Handles guardrails, hooks, tracing, and retries automatically.
   */
  async run(
    input: TInput,
    context: RunContext<TContext>,
    options?: { maxRetries?: number; timeoutMs?: number; trace?: Trace }
  ): Promise<TOutput> {
    const trace = options?.trace || tracer.startTrace(context.traceId);
    const span = tracer.startSpan(trace, this.name, input);
    const maxRetries = options?.maxRetries || 2;

    // ── Input guardrails ──
    await this.hooks.onStart?.(context, input);

    const { passed: inputOk, warnings: inputWarnings } = await runGuardrails(
      this.inputGuardrails as InputGuardrail[],
      input
    );

    if (!inputOk) {
      const err = new Error(
        `Input guardrail failed: ${inputWarnings.map((w) => w.message).join("; ")}`
      );
      await this.hooks.onError?.(context, input, err);
      tracer.endSpan(span, "failed", undefined, err.message);
      throw err;
    }

    for (const w of inputWarnings) {
      console.warn(`[${this.name}] Guardrail warn: ${w.message}`);
    }

    // ── Execute with retry ──
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      span.attempts = attempt + 1;
      try {
        const output = await this.execute(input, context, this.hooks);

        // ── Output guardrails ──
        const { passed: outputOk, warnings: outputWarnings } =
          await runGuardrails(
            this.outputGuardrails as OutputGuardrail[],
            output
          );

        if (!outputOk) {
          const err = new Error(
            `Output guardrail failed: ${outputWarnings.map((w) => w.message).join("; ")}`
          );
          if (attempt < maxRetries) {
            lastError = err;
            continue;
          }
          await this.hooks.onError?.(context, input, err);
          tracer.endSpan(span, "failed", output, err.message);
          throw err;
        }

        for (const w of outputWarnings) {
          console.warn(`[${this.name}] Guardrail warn: ${w.message}`);
        }

        // Schema validation (optional)
        if (this.outputSchema) {
          const parsed = this.outputSchema.safeParse(output);
          if (!parsed.success) {
            if (attempt < maxRetries) {
              lastError = new Error(
                `Schema validation: ${parsed.error.issues.map((i) => i.message).join("; ")}`
              );
              continue;
            }
            throw new Error(
              `Agent ${this.name} output failed schema validation after ${maxRetries + 1} attempts`
            );
          }
        }

        await this.hooks.onEnd?.(context, input, output);
        tracer.endSpan(span, "succeeded", output);
        return output;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          console.error(
            `[${this.name}] Attempt ${attempt + 1} failed:`,
            lastError.message
          );
        }
      }
    }

    const finalError =
      lastError || new Error(`Agent ${this.name} failed after retries`);
    await this.hooks.onError?.(context, input, finalError);
    tracer.endSpan(span, "failed", undefined, finalError.message);
    throw finalError;
  }
}
