import { backends } from "@antumbra/domain-backends/feature.ts";
import { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import { testing } from "@antumbra/server-journal/testing/entry.ts";
import { Effect, Option, Stream } from "effect";
import { voyages } from "#feature.ts";

export const it = testing([voyages, roleSettings, backends]);

export const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "the reef is uncharted",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
} as const;

export const answered = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value, Failure> =>
	Effect.map(Stream.runHead(stream), Option.getOrThrow);
