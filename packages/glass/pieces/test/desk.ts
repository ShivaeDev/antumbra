import { rewire } from "@antumbra/domain-pieces/commands/rewire.ts";
import { pieces } from "@antumbra/domain-pieces/feature.ts";
import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { api } from "@antumbra/platform-rpc/client.ts";
import { group, type Rpcs } from "@antumbra/platform-rpc/group.ts";
import { ClientToken, layerClient, layerServer, ServerToken } from "@antumbra/platform-rpc/token.ts";
import { Effect, Layer, Stream } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

const FEATURES = [pieces] as const;

export const VOYAGE = "voyage-reef";

export const SOUNDINGS = "piece-soundings";

export const CHARTS = "piece-charts";

const charted = (id: string, title: string) => ({
	charter: `sound ${title}`,
	charteredAt: `2026-01-0${id === SOUNDINGS ? 1 : 2}T00:00:00.000Z`,
	expectation: `${title} is landed`,
	id,
	launchedAt: null,
	parkedAt: null,
	role: "hand",
	title,
	verdict: null,
	voyageId: VOYAGE,
});

export const MEMBERS = [charted(SOUNDINGS, "Soundings"), charted(CHARTS, "Charts")];

export interface Said {
	readonly command: string;
	readonly input: Readonly<Record<string, unknown>>;
}

export interface Desk {
	readonly glass: Glass<typeof FEATURES>;
	readonly said: readonly Said[];
}

type Handlers = Record<string, unknown>;

interface LooseGroup {
	readonly toLayer: (handlers: Handlers) => Layer.Layer<Rpc.ToHandler<Rpcs<typeof FEATURES>>>;
}

function looseGroup(built: unknown): LooseGroup;
function looseGroup(built: unknown): unknown {
	return built;
}

type Rewiring = {
	readonly dependsOn: readonly string[];
	readonly id: string;
};

const handlersOf = (said: Said[]): Handlers => {
	let seq = 0;
	const heard = (command: string) => (input: Readonly<Record<string, unknown>>) => {
		said.push({ command, input });
		seq += 1;
		return Effect.succeed(seq);
	};
	return {
		"pieces.all": () => Stream.make(MEMBERS),
		"pieces.byId": () => Stream.make(null),
		"pieces.byVoyage": () => Stream.make(MEMBERS),
		"pieces.charter": heard("charter"),
		"pieces.edges": () => Stream.make([]),
		"pieces.landVerdict": heard("landVerdict"),
		"pieces.launch": heard("launch"),
		"pieces.park": heard("park"),
		"pieces.rewire": (input: Rewiring) => {
			if (input.dependsOn.includes(input.id)) {
				return Effect.fail(
					new rewire.Rejection.WouldCycle({
						field: "dependsOn",
						from: input.id,
						message: "A piece cannot wait on work that waits on it",
						to: input.id,
					}),
				);
			}
			return heard("rewire")(input);
		},
		"pieces.unpark": heard("unpark"),
	};
};

export const desk = (): Desk => {
	const said: Said[] = [];
	const tokens = Layer.merge(
		Layer.provide(layerServer, Layer.succeed(ServerToken, { token: "the-right-token" })),
		Layer.provide(layerClient, Layer.succeed(ClientToken, { token: "the-right-token" })),
	);
	const handlers = looseGroup(group(FEATURES)).toLayer(handlersOf(said));
	const built = Effect.map(RpcTest.makeClient(group(FEATURES), { flatten: true }), (calls) => api(FEATURES, calls)).pipe(
		Effect.provide(Layer.merge(handlers, tokens)),
	);
	return { glass: served(FEATURES, built), said };
};
