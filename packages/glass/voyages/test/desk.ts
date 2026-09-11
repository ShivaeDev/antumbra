import { backends } from "@antumbra/domain-backends/feature.ts";
import { open } from "@antumbra/domain-voyages/commands/open.ts";
import { voyages } from "@antumbra/domain-voyages/feature.ts";
import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { api } from "@antumbra/platform-rpc/client.ts";
import { group, type Rpcs } from "@antumbra/platform-rpc/group.ts";
import { ClientToken, layerClient, layerServer, ServerToken } from "@antumbra/platform-rpc/token.ts";
import { Effect, Layer, Stream } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

const FEATURES = [voyages, backends] as const;

export interface Sent {
	readonly context: string;
	readonly kind: string;
	readonly name: string;
	readonly northStar: string;
}

export interface Desk {
	readonly glass: Glass<typeof FEATURES>;
	readonly sent: readonly Sent[];
}

interface Model {
	readonly backend: string;
	readonly efforts: readonly string[];
	readonly id: string;
	readonly isDefault: boolean;
	readonly model: string;
	readonly name: string;
}

const CATALOGUE: readonly Model[] = [
	{ backend: "claude", efforts: ["low", "high"], id: "claude/opus", isDefault: true, model: "opus", name: "Opus" },
];

type Handlers = Record<string, unknown>;

interface LooseGroup {
	readonly toLayer: (handlers: Handlers) => Layer.Layer<Rpc.ToHandler<Rpcs<typeof FEATURES>>>;
}

function looseGroup(built: unknown): LooseGroup;
function looseGroup(built: unknown): unknown {
	return built;
}

const handlersOf = (sent: Sent[]): Handlers => {
	let seq = 0;
	return {
		"backends.catalog": (input: { readonly backend: string }) => Stream.make({ backend: input.backend, failure: null }),
		"backends.efforts": (input: { readonly backend: string; readonly model: string }) =>
			Stream.make(CATALOGUE.find((listed) => listed.backend === input.backend && listed.model === input.model)?.efforts ?? []),
		"backends.listModels": () => Effect.succeed(0),
		"backends.models": (input: { readonly backend: string }) => Stream.make(CATALOGUE.filter((listed) => listed.backend === input.backend)),
		"voyages.byId": () => Stream.make(null),
		"voyages.list": () => Stream.make([]),
		"voyages.open": (input: Sent) => {
			if (input.name.trim() === "") {
				return Effect.fail(new open.Rejection.Blank({ field: "name", message: "A voyage needs a name" }));
			}
			sent.push(input);
			seq += 1;
			return Effect.succeed(seq);
		},
		"voyages.setFocus": () => Effect.succeed(0),
	};
};

export const desk = (): Desk => {
	const sent: Sent[] = [];
	const tokens = Layer.merge(
		Layer.provide(layerServer, Layer.succeed(ServerToken, { token: "the-right-token" })),
		Layer.provide(layerClient, Layer.succeed(ClientToken, { token: "the-right-token" })),
	);
	const handlers = looseGroup(group(FEATURES)).toLayer(handlersOf(sent));
	const built = Effect.map(RpcTest.makeClient(group(FEATURES), { flatten: true }), (calls) => api(FEATURES, calls)).pipe(
		Effect.provide(Layer.merge(handlers, tokens)),
	);
	return { glass: served(FEATURES, built), sent };
};
