/**
 * Trace and Span — following OpenAI Agents SDK tracing model.
 * Each agent run creates a span. The pipeline creates a trace.
 */
export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  agentName: string;
  status: "pending" | "running" | "succeeded" | "failed";
  startedAt: Date;
  finishedAt?: Date;
  input: unknown;
  output?: unknown;
  error?: string;
  attempts: number;
  metadata: Record<string, unknown>;
}

export interface Trace {
  traceId: string;
  spans: Span[];
  startedAt: Date;
  finishedAt?: Date;
  status: "running" | "completed" | "failed";
}

/**
 * In-memory tracer for development.
 * In production, you'd send spans to an OTLP-compatible collector.
 */
export class Tracer {
  private traces: Map<string, Trace> = new Map();

  startTrace(traceId?: string): Trace {
    const id = traceId || `trace-${Date.now()}`;
    const trace: Trace = {
      traceId: id,
      spans: [],
      startedAt: new Date(),
      status: "running",
    };
    this.traces.set(id, trace);
    return trace;
  }

  startSpan(trace: Trace, agentName: string, input: unknown, parentSpanId?: string): Span {
    const span: Span = {
      spanId: `span-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      traceId: trace.traceId,
      parentSpanId,
      agentName,
      status: "running",
      startedAt: new Date(),
      input,
      attempts: 0,
      metadata: {},
    };
    trace.spans.push(span);
    return span;
  }

  endSpan(span: Span, status: Span["status"], output?: unknown, error?: string) {
    span.status = status;
    span.finishedAt = new Date();
    span.output = output;
    span.error = error;
  }

  endTrace(trace: Trace, status: Trace["status"]) {
    trace.status = status;
    trace.finishedAt = new Date();
  }

  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  /** Convert trace to a JSON-serializable summary (for DB/logging) */
  summarize(trace: Trace): Record<string, unknown> {
    const totalMs =
      trace.finishedAt && trace.startedAt
        ? trace.finishedAt.getTime() - trace.startedAt.getTime()
        : 0;
    return {
      traceId: trace.traceId,
      status: trace.status,
      durationMs: totalMs,
      spanCount: trace.spans.length,
      spans: trace.spans.map((s) => ({
        agentName: s.agentName,
        status: s.status,
        attempts: s.attempts,
        durationMs: s.finishedAt
          ? s.finishedAt.getTime() - s.startedAt.getTime()
          : 0,
        error: s.error?.slice(0, 200),
      })),
    };
  }
}

/** Global tracer singleton */
export const tracer = new Tracer();
