import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { api } from "@antumbra/rpc/client.ts";
import { group, type Rpcs } from "@antumbra/rpc/group.ts";
import { ClientToken, layerClient, layerServer, ServerToken } from "@antumbra/rpc/token.ts";
import { setCount } from "@antumbra/settings-domain/commands/set-count.ts";
import { settings } from "@antumbra/settings-domain/feature.ts";
import { COUNT_KEYS, COUNTS, type CountKey, FLAG_KEYS, FLAGS } from "@antumbra/settings-domain/ids.ts";
import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

const FEATURES = [settings] as const;

export interface Sent {
	readonly count?: number;
	readonly key: string;
	readonly on?: boolean;
}

export type Held = ReadonlyMap<string, boolean | number>;

export interface Desk {
	readonly glass: Glass<typeof FEATURES>;
	readonly sent: readonly Sent[];
	readonly stored: SubscriptionRef.SubscriptionRef<Held>;
}

interface Board {
	readonly sent: Sent[];
	readonly stored: SubscriptionRef.SubscriptionRef<Held>;
}

const flagsOf = (stored: Held) => FLAG_KEYS.map((key) => ({ key, on: stored.get(key) === true, title: FLAGS[key].title }));

const countsOf = (stored: Held) =>
	COUNT_KEYS.map((key) => {
		const held = stored.get(key);
		return { count: typeof held === "number" ? held : COUNTS[key].fallback, key, title: COUNTS[key].title };
	});

type Handlers = Record<string, unknown>;

interface LooseGroup {
	readonly toLayer: (handlers: Handlers) => Layer.Layer<Rpc.ToHandler<Rpcs<typeof FEATURES>>>;
}

function looseGroup(built: unknown): LooseGroup;
function looseGroup(built: unknown): unknown {
	return built;
}

const holding = (board: Board, landed: Effect.Effect<number>, input: Sent, value: boolean | number) =>
	Effect.gen(function* () {
		board.sent.push(input);
		yield* SubscriptionRef.update(board.stored, (held) => new Map(held).set(input.key, value));
		return yield* landed;
	});

const handlersOf = (board: Board): Handlers => {
	let seq = 0;
	const landed = Effect.sync(() => {
		seq += 1;
		return seq;
	});
	return {
		"settings.counts": () => Stream.map(SubscriptionRef.changes(board.stored), countsOf),
		"settings.flags": () => Stream.map(SubscriptionRef.changes(board.stored), flagsOf),
		"settings.setCount": (input: { readonly count: number; readonly key: CountKey }) => {
			const declaration = COUNTS[input.key];
			if (input.count < declaration.min || input.count > declaration.max) {
				return Effect.fail(
					new setCount.Rejection.OutOfRange({
						field: "count",
						key: input.key,
						max: declaration.max,
						message: `${declaration.title} takes a whole number from ${declaration.min} to ${declaration.max}`,
						min: declaration.min,
					}),
				);
			}
			return holding(board, landed, input, input.count);
		},
		"settings.setFlag": (input: { readonly key: string; readonly on: boolean }) => holding(board, landed, input, input.on),
	};
};

export const desk = (): Desk => {
	const sent: Sent[] = [];
	const stored = Effect.runSync(SubscriptionRef.make<Held>(new Map()));
	const tokens = Layer.merge(
		Layer.provide(layerServer, Layer.succeed(ServerToken, { token: "the-right-token" })),
		Layer.provide(layerClient, Layer.succeed(ClientToken, { token: "the-right-token" })),
	);
	const handlers = looseGroup(group(FEATURES)).toLayer(handlersOf({ sent, stored }));
	const built = Effect.map(RpcTest.makeClient(group(FEATURES), { flatten: true }), (calls) => api(FEATURES, calls)).pipe(
		Effect.provide(Layer.merge(handlers, tokens)),
	);
	return { glass: served(FEATURES, built), sent, stored };
};
