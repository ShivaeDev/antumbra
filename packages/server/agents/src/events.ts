import { agentRetired } from "@antumbra/domain-agents/facts/agent-retired.ts";
import { birthAdmitted } from "@antumbra/domain-agents/facts/birth-admitted.ts";
import { birthCancelled } from "@antumbra/domain-agents/facts/birth-cancelled.ts";
import { birthDelayed } from "@antumbra/domain-agents/facts/birth-delayed.ts";
import { birthHeld } from "@antumbra/domain-agents/facts/birth-held.ts";
import { birthRequested } from "@antumbra/domain-agents/facts/birth-requested.ts";
import { birthRetried } from "@antumbra/domain-agents/facts/birth-retried.ts";
import { crewRetired } from "@antumbra/domain-agents/facts/crew-retired.ts";
import { smoothingRequested } from "@antumbra/domain-agents/facts/smoothing-requested.ts";
import { Schema } from "effect";
export const Events = Schema.Union([
	Schema.TaggedStruct("CrewRetired", { ...crewRetired.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("AgentRetired", { ...agentRetired.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SmoothingRequested", { ...smoothingRequested.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BirthRequested", { ...birthRequested.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BirthAdmitted", { ...birthAdmitted.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BirthHeld", { ...birthHeld.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BirthDelayed", { ...birthDelayed.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BirthCancelled", { ...birthCancelled.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BirthRetried", { ...birthRetried.payload, at: Schema.Number, sequence: Schema.Number }),
]);
