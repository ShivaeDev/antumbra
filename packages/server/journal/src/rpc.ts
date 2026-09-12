import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { FeaturePorts, FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { group, type Rpcs } from "@antumbra/platform-rpc/group.ts";
import { layerServer, type ServerToken, type Token } from "@antumbra/platform-rpc/token.ts";
import { Effect, Layer, type Stream } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import { Commit, type CommitService } from "#commit.ts";
import { Live, type LiveService } from "#live.ts";

type Handlers = Record<string, unknown>;

interface LooseCommit {
	readonly commit: (command: CommandShape, input: Record<string, unknown>) => Effect.Effect<number, unknown>;
}

interface LooseLive {
	readonly live: (query: QueryShape, input: Record<string, unknown>) => Stream.Stream<unknown>;
}

interface LooseGroup {
	readonly toLayer: (build: Effect.Effect<Handlers, never, Commit | Live>) => Layer.Layer<never, never, Commit | Live>;
}

function looseCommit(service: CommitService): LooseCommit;
function looseCommit(service: unknown): unknown {
	return service;
}

function looseLive(service: LiveService): LooseLive;
function looseLive(service: unknown): unknown {
	return service;
}

function looseGroup(served: unknown): LooseGroup;
function looseGroup(served: unknown): unknown {
	return served;
}

const handlersOf = (features: readonly FeatureShape[], commit: LooseCommit, live: LooseLive): Handlers =>
	Object.fromEntries(
		features.flatMap((feature) => [
			...feature.commands.map((command) => [`${feature.name}.${command.name}`, (input: Record<string, unknown>) => commit.commit(command, input)]),
			...feature.queries.map((query) => [`${feature.name}.${query.name}`, (input: Record<string, unknown>) => live.live(query, input)]),
		]),
	);

export function serving<const Features extends readonly FeatureShape[]>(
	features: Features,
): Layer.Layer<Rpc.ToHandler<Rpcs<Features>> | Token, never, Commit | FeaturePorts<Features> | Live | ServerToken>;
export function serving(features: readonly FeatureShape[]): unknown {
	const handlers = Effect.gen(function* () {
		const commit = looseCommit(yield* Commit);
		const live = looseLive(yield* Live);
		return handlersOf(features, commit, live);
	});
	return Layer.merge(looseGroup(group(features)).toLayer(handlers), layerServer);
}
