/**
 * Lifecycle hooks following OpenAI Agents SDK pattern.
 * Hooks observe agent execution without modifying it.
 */
export interface AgentHooks<TContext = unknown, TInput = unknown, TOutput = unknown> {
  /** Called before the agent starts processing */
  onStart?: (ctx: RunContext<TContext>, input: TInput) => void | Promise<void>;

  /** Called after the agent successfully completes */
  onEnd?: (
    ctx: RunContext<TContext>,
    input: TInput,
    output: TOutput
  ) => void | Promise<void>;

  /** Called when the agent fails */
  onError?: (
    ctx: RunContext<TContext>,
    input: TInput,
    error: Error
  ) => void | Promise<void>;

  /** Called before each LLM call */
  onLLMStart?: (ctx: RunContext<TContext>) => void | Promise<void>;

  /** Called after each LLM call completes */
  onLLMEnd?: (
    ctx: RunContext<TContext>,
    usage?: LLMUsage
  ) => void | Promise<void>;

  /** Called before a tool is invoked */
  onToolStart?: (ctx: RunContext<TContext>, toolName: string) => void | Promise<void>;

  /** Called after a tool completes */
  onToolEnd?: (
    ctx: RunContext<TContext>,
    toolName: string,
    result: unknown
  ) => void | Promise<void>;
}

export interface LLMUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * Shared execution context carried across agent runs.
 * Like the SDK's RunContextWrapper.
 */
export class RunContext<T = unknown> {
  /** Application-specific shared state */
  context: T;

  /** Unique trace id for the entire pipeline run */
  traceId: string;

  /** Accumulated usage across all LLM calls in this run */
  usage: LLMUsage;

  /** Arbitrary metadata bag */
  metadata: Record<string, unknown>;

  constructor(context: T, traceId?: string) {
    this.context = context;
    this.traceId = traceId || `trace-${Date.now()}`;
    this.usage = {};
    this.metadata = {};
  }

  addUsage(u: LLMUsage) {
    this.usage.promptTokens =
      (this.usage.promptTokens || 0) + (u.promptTokens || 0);
    this.usage.completionTokens =
      (this.usage.completionTokens || 0) + (u.completionTokens || 0);
    this.usage.totalTokens =
      (this.usage.totalTokens || 0) + (u.totalTokens || 0);
  }
}

/** Default no-op hooks for when none are provided */
export const NoOpHooks: AgentHooks = {};
