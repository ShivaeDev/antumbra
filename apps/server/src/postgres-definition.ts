import { Events as agents } from "@antumbra/server-agents/events.ts";
import { Events as capacity } from "@antumbra/server-capacity/events.ts";
import { Events as inputs } from "@antumbra/server-inputs/events.ts";
import { Events as lifecycle } from "@antumbra/server-lifecycle/events.ts";
import { Events as reclamation } from "@antumbra/server-reclamation/events.ts";
import { Events as rulings } from "@antumbra/server-rulings/events.ts";
import { Events as sessions } from "@antumbra/server-sessions/events.ts";
import { ExecutionDefinition } from "@antumbra/server-storage/execution/definition.ts";
import { Events as supervision } from "@antumbra/server-supervision/events.ts";
import { Layer, Schema } from "effect";
import { definition } from "#definition.ts";
import { apply, refresh } from "#execution/projection.ts";

const events = Schema.Union([
	sessions,
	agents,
	capacity,
	reclamation,
	rulings,
	lifecycle,
	supervision,
	inputs,
	Schema.TaggedStruct("ExecutionSequenceObserved", { at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RunnerCursorAdvanced", { logId: Schema.String, cursor: Schema.Number, at: Schema.Number, sequence: Schema.Number }),
]);
export const postgresDefinition = Layer.succeed(ExecutionDefinition, {
	project: apply,
	refresh,
	events,
	names: [
		...definition.features
			.filter((feature) => ["sessions", "agents", "capacity", "reclamation", "rulings", "lifecycle", "supervision", "inputs"].includes(feature.name))
			.flatMap((feature) => feature.facts.map((fact) => fact.name)),
	],
});
