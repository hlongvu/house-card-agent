import { Agent } from "./agent";
import { RunContext } from "./hooks";

/**
 * Orchestration patterns mirroring OpenAI Agents SDK:
 *
 * 1. Chain    — agent1 → agent2 → agent3 (deterministic pipeline)
 * 2. Parallel — run agents concurrently when independent
 * 3. Manager  — a main agent calls specialist sub-agents as tools
 */

/**
 * Run agents in sequence (chain pattern).
 * The output of each agent becomes the input of the next, optionally transformed.
 */
export async function chain<A, B, C, TContext>(
  agents: [
    Agent<A, B, TContext>,
    Agent<B, C, TContext>,
  ],
  input: A,
  context: RunContext<TContext>,
  options?: { maxRetries?: number; timeoutMs?: number }
): Promise<C>;

export async function chain<A, B, C, D, TContext>(
  agents: [
    Agent<A, B, TContext>,
    Agent<B, C, TContext>,
    Agent<C, D, TContext>,
  ],
  input: A,
  context: RunContext<TContext>,
  options?: { maxRetries?: number; timeoutMs?: number }
): Promise<D>;

export async function chain<A, B, TContext>(
  agents: Array<Agent<any, any, TContext>>,
  input: A,
  context: RunContext<TContext>,
  options?: { maxRetries?: number; timeoutMs?: number }
): Promise<B> {
  let current = input;

  for (const agent of agents) {
    current = await agent.run(current, context, options);
  }

  return current as unknown as B;
}

/**
 * Run agents concurrently.
 * Each agent starts from the same input value.
 */
export async function parallel<TInput, TContext>(
  agents: Array<Agent<TInput, any, TContext>>,
  input: TInput,
  context: RunContext<TContext>,
  options?: { maxRetries?: number; timeoutMs?: number }
): Promise<unknown[]> {
  return Promise.all(
    agents.map((agent) => agent.run(input, context, options))
  );
}

/**
 * Manager pattern — agents exposed as callable tools.
 *
 * A manager agent's execute function can call sub-agents directly.
 * Unlike handoffs, the manager retains control over the conversation.
 */
export class AgentTool<TInput, TOutput, TContext> {
  name: string;
  description: string;
  private agent: Agent<TInput, TOutput, TContext>;

  constructor(agent: Agent<TInput, TOutput, TContext>) {
    this.name = agent.name;
    this.description = agent.description;
    this.agent = agent;
  }

  /** Call the agent as a tool from a manager/parent agent */
  async call(
    input: TInput,
    context: RunContext<TContext>,
    options?: { maxRetries?: number; timeoutMs?: number }
  ): Promise<TOutput> {
    return this.agent.run(input, context, options);
  }
}

/**
 * Convert any agent into a tool that can be called by a manager agent.
 * Mirrors `Agent.as_tool()` from the OpenAI Agents SDK.
 */
export function asTool<TInput, TOutput, TContext>(
  agent: Agent<TInput, TOutput, TContext>
): AgentTool<TInput, TOutput, TContext> {
  return new AgentTool(agent);
}
