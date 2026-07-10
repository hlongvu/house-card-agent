import type { ZodSchema } from "zod";

/**
 * Result of running a guardrail check.
 * Matches the OpenAI Agents SDK Guardrail pattern.
 */
export interface GuardrailResult {
  /** Whether the check passed */
  passed: boolean;

  /** If failed, severities: "block" = halt pipeline, "warn" = continue but flag */
  severity: "block" | "warn";

  /** Human-readable message */
  message?: string;

  /** Structured details */
  details?: Record<string, unknown>;
}

export const GuardrailResult = {
  pass: (): GuardrailResult => ({ passed: true, severity: "warn" }),
  warn: (message: string, details?: Record<string, unknown>): GuardrailResult => ({
    passed: true,
    severity: "warn",
    message,
    details,
  }),
  block: (message: string, details?: Record<string, unknown>): GuardrailResult => ({
    passed: false,
    severity: "block",
    message,
    details,
  }),
};

/**
 * Input guardrail — checks input before handing to the agent.
 */
export interface InputGuardrail<TInput = unknown> {
  name: string;
  check(input: TInput): GuardrailResult | Promise<GuardrailResult>;
}

/**
 * Output guardrail — checks agent output before passing downstream.
 */
export interface OutputGuardrail<TOutput = unknown> {
  name: string;
  check(output: TOutput): GuardrailResult | Promise<GuardrailResult>;
}

/**
 * Schema-based output guardrail — validates output against a Zod schema.
 */
export function createSchemaGuardrail<T>(
  name: string,
  schema: ZodSchema<T>
): OutputGuardrail<T> {
  return {
    name,
    check(output: T): GuardrailResult {
      const result = schema.safeParse(output);
      if (!result.success) {
        const issues = result.error.issues.map((i) => i.message).join("; ");
        return GuardrailResult.block(`Schema validation failed: ${issues}`, {
          errors: result.error.issues,
        });
      }
      return GuardrailResult.pass();
    },
  };
}

/**
 * Validate a list of guardrails and return the aggregate result.
 * First "block" failure stops execution. "warn" results are collected.
 */
export async function runGuardrails<T>(
  guardrails: Array<InputGuardrail<T> | OutputGuardrail<T>>,
  value: T
): Promise<{ passed: boolean; warnings: GuardrailResult[] }> {
  const warnings: GuardrailResult[] = [];

  for (const g of guardrails) {
    const result = await g.check(value);
    if (!result.passed && result.severity === "block") {
      return { passed: false, warnings: [result, ...warnings] };
    }
    if (!result.passed || result.severity === "warn") {
      warnings.push(result);
    }
  }

  return { passed: true, warnings };
}
