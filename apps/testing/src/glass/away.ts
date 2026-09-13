import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import { Effect, Stream, SubscriptionRef } from "effect";
import { RpcClientError } from "effect/unstable/rpc/RpcClientError";
import { SocketCloseError } from "effect/unstable/socket/Socket";

type Away = SubscriptionRef.SubscriptionRef<boolean>;

const dropped = () => new RpcClientError({ reason: new SocketCloseError({ code: 1006 }) });

function loose(api: unknown): Record<string, Record<string, unknown>>;
function loose(api: unknown): unknown {
	return api;
}

function sendOf(call: unknown): (input: Record<string, unknown>) => Effect.Effect<number, unknown>;
function sendOf(call: unknown): unknown {
	return call;
}

function streamOf(call: unknown): (input: Record<string, unknown>) => Stream.Stream<unknown, unknown>;
function streamOf(call: unknown): unknown {
	return call;
}

const leaving = (away: Away): Stream.Stream<never, RpcClientError> =>
	Stream.flatMap(
		Stream.filter(SubscriptionRef.changes(away), (gone) => gone),
		() => Stream.fail(dropped()),
	);

const watched = (away: Away, call: unknown) => (input: Record<string, unknown>) =>
	Stream.unwrap(
		Effect.map(SubscriptionRef.get(away), (gone) =>
			gone ? Stream.fail(dropped()) : Stream.merge(streamOf(call)(input), leaving(away), { haltStrategy: "left" }),
		),
	);

const sent = (away: Away, call: unknown) => (input: Record<string, unknown>) =>
	Effect.flatMap(SubscriptionRef.get(away), (gone) => (gone ? Effect.fail(dropped()) : sendOf(call)(input)));

const calls = (feature: FeatureShape, api: unknown, away: Away): Record<string, unknown> => {
	const reached = loose(api)[feature.name] ?? {};
	const gated: Record<string, unknown> = { ...reached };
	for (const command of feature.commands) {
		gated[command.name] = sent(away, reached[command.name]);
	}
	for (const query of feature.queries) {
		gated[query.name] = watched(away, reached[query.name]);
	}
	return gated;
};

export function dropping<const Features extends readonly FeatureShape[]>(
	features: Features,
	api: Api<Features>,
	away: Away,
): Api<Features, RpcClientError>;
export function dropping(features: readonly FeatureShape[], api: unknown, away: Away): unknown {
	return Object.fromEntries(features.map((feature) => [feature.name, calls(feature, api, away)]));
}
