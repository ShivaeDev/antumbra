import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { roleSettings } from "@antumbra/role-settings/feature.ts";
import { FLEET } from "@antumbra/role-settings/ids.ts";
import { api } from "@antumbra/rpc/client.ts";
import { group, type Rpcs } from "@antumbra/rpc/group.ts";
import { ClientToken, layerClient, layerServer, ServerToken } from "@antumbra/rpc/token.ts";
import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

export interface Choice {
	readonly backend: string | null;
	readonly effort: string | null;
	readonly model: string | null;
	readonly role: string;
	readonly scope: string;
}

export interface Setting extends Choice {
	readonly id: string;
}

export interface Desk {
	readonly glass: Glass<[typeof roleSettings]>;
	readonly sent: readonly Choice[];
	readonly settings: SubscriptionRef.SubscriptionRef<readonly Setting[]>;
}

type Handlers = Record<string, unknown>;

interface LooseGroup {
	readonly toLayer: (handlers: Handlers) => Layer.Layer<Rpc.ToHandler<Rpcs<[typeof roleSettings]>>>;
}

function looseGroup(built: unknown): LooseGroup;
function looseGroup(built: unknown): unknown {
	return built;
}

const settingOf = (choice: Choice): Setting => ({ ...choice, id: `${choice.scope}/${choice.role}` });

const scoped = (settings: SubscriptionRef.SubscriptionRef<readonly Setting[]>, scope: string) =>
	Stream.map(SubscriptionRef.changes(settings), (rows) => rows.filter((row) => row.scope === scope));

const handlersOf = (desk: { readonly sent: Choice[]; readonly settings: Desk["settings"] }): Handlers => {
	let seq = 0;
	return {
		"roleSettings.choose": (input: Choice) =>
			Effect.gen(function* () {
				desk.sent.push(input);
				yield* SubscriptionRef.update(desk.settings, (rows) => [
					...rows.filter((row) => !(row.scope === input.scope && row.role === input.role)),
					settingOf(input),
				]);
				seq += 1;
				return seq;
			}),
		"roleSettings.defaults": () => scoped(desk.settings, FLEET),
		"roleSettings.forVoyage": (input: { readonly voyageId: string }) => scoped(desk.settings, input.voyageId),
		"roleSettings.resolve": (input: { readonly role: string }) =>
			Stream.map(SubscriptionRef.changes(desk.settings), (rows) => {
				const standing = rows.find((row) => row.scope === FLEET && row.role === input.role);
				return { backend: standing?.backend ?? "claude", effort: standing?.effort ?? null, model: standing?.model ?? null };
			}),
	};
};

export const desk = (options?: { readonly token?: string }): Desk => {
	const sent: Choice[] = [];
	const settings = Effect.runSync(SubscriptionRef.make<readonly Setting[]>([]));
	const tokens = Layer.merge(
		Layer.provide(layerServer, Layer.succeed(ServerToken, { token: "the-right-token" })),
		Layer.provide(layerClient, Layer.succeed(ClientToken, { token: options?.token ?? "the-right-token" })),
	);
	const handlers = looseGroup(group([roleSettings])).toLayer(handlersOf({ sent, settings }));
	const built = Effect.map(RpcTest.makeClient(group([roleSettings]), { flatten: true }), (calls) => api([roleSettings], calls)).pipe(
		Effect.provide(Layer.merge(handlers, tokens)),
	);
	return { glass: served([roleSettings], built), sent, settings };
};
