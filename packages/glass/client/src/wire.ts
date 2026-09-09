import type { CommandShape } from "@antumbra/feature/command.ts";
import type { FeatureShape } from "@antumbra/feature/feature.ts";
import type { QueryShape } from "@antumbra/feature/query.ts";
import { type Watching, watching } from "@antumbra/rpc/query.ts";
import { Effect, Stream } from "effect";

export type Wire = Effect.Effect<unknown>;

type Loose = Record<string, Record<string, unknown> | undefined>;

function loose(built: unknown): Loose;
function loose(built: unknown): unknown {
	return built;
}

function sendOf(call: unknown): (input: Record<string, unknown>) => Effect.Effect<number, unknown>;
function sendOf(call: unknown): unknown {
	return call;
}

function streamOf(call: unknown): (input: Record<string, unknown>) => Stream.Stream<unknown, unknown>;
function streamOf(call: unknown): unknown {
	return call;
}

const reached = (wire: Wire, feature: string, name: string): Effect.Effect<unknown> => Effect.map(wire, (built) => loose(built)[feature]?.[name]);

const sent = (wire: Wire, feature: string, command: CommandShape) =>
	Object.assign(
		(input: Record<string, unknown>): Effect.Effect<number, unknown> =>
			Effect.flatMap(reached(wire, feature, command.name), (call) => sendOf(call)(input)),
		{ command },
	);

const watchOf = (wire: Wire, feature: string, query: QueryShape) =>
	watching(query.input, (input) => Stream.unwrap(Effect.map(reached(wire, feature, query.name), (call) => streamOf(call)(input))));

const callsOf = (feature: FeatureShape, wire: Wire): Record<string, unknown> => ({
	...Object.fromEntries(feature.commands.map((command) => [command.name, sent(wire, feature.name, command)])),
	...Object.fromEntries(feature.queries.map((query) => [query.name, watchOf(wire, feature.name, query)])),
});

export const deferred = (features: readonly FeatureShape[], wire: Wire): Record<string, unknown> =>
	Object.fromEntries(features.map((feature) => [feature.name, callsOf(feature, wire)]));

function watchingOf(call: unknown): Watching | undefined;
function watchingOf(call: unknown): unknown {
	return call;
}

export const queriesOf = (features: readonly FeatureShape[], api: Record<string, unknown>): ReadonlyMap<QueryShape, Watching> => {
	const queries = new Map<QueryShape, Watching>();
	for (const feature of features) {
		const calls = loose(api)[feature.name];
		for (const query of feature.queries) {
			const call = watchingOf(calls?.[query.name]);
			if (call !== undefined) {
				queries.set(query, call);
			}
		}
	}
	return queries;
};
