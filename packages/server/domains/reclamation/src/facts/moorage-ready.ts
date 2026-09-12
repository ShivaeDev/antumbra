import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";

export const moorageReady = fact("MoorageReady", { agentId: Schema.String });
