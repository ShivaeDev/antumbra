import { Brand } from "effect";

export type AgentPrompt = string & Brand.Brand<"AgentPrompt">;

export const agentPrompt = Brand.nominal<AgentPrompt>();
