import { toolAnswered } from "@antumbra/domain-sessions/commands/answer-tool.ts";
import { toolCalled } from "@antumbra/domain-sessions/commands/call-tool.ts";
import { sessionChartered } from "@antumbra/domain-sessions/commands/charter.ts";
import { operationHeld } from "@antumbra/domain-sessions/commands/hold.ts";
import { operationRetried } from "@antumbra/domain-sessions/commands/retry.ts";
import { sessionStopped } from "@antumbra/domain-sessions/commands/stop.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { operationRequested } from "@antumbra/domain-sessions/facts/operation-requested.ts";
import { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import { Schema } from "effect";
export const Events = Schema.Union([
	Schema.TaggedStruct("SessionProviderEvent", { ...providerEvent.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionToolCalled", { ...toolCalled.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionOperationRetried", { ...operationRetried.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionToolAnswered", { ...toolAnswered.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionObserved", { ...observed.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionOperationRequested", { ...operationRequested.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionOperationHeld", { ...operationHeld.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionChartered", { ...sessionChartered.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("SessionStopped", { ...sessionStopped.payload, at: Schema.Number, sequence: Schema.Number }),
]);
