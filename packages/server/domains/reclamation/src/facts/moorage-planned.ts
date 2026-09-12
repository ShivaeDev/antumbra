import { fact } from "@antumbra/platform-feature/fact.ts";
import { Moorage } from "@antumbra/platform-runner/resources.ts";
import { Schema } from "effect";

export const mooragePlanned = fact("MooragePlanned", { agentId: Schema.String, runner: Schema.String, plan: Moorage });
