import { backends } from "@antumbra/domain-backends/feature.ts";
import { roleSettings } from "@antumbra/domain-role-settings/feature.ts";
import { FLEET } from "@antumbra/domain-role-settings/ids.ts";
import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { api } from "@antumbra/platform-rpc/client.ts";
import { group, type Rpcs } from "@antumbra/platform-rpc/group.ts";
import { ClientToken, layerClient, layerServer, ServerToken } from "@antumbra/platform-rpc/token.ts";
import { AGENT_ROLES, VOYAGE_AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcTest from "effect/unstable/rpc/RpcTest";

const FEATURES = [roleSettings, backends] as const;

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

export interface Model {
	readonly backend: string;
	readonly efforts: readonly string[];
	readonly id: string;
	readonly isDefault: boolean;
	readonly model: string;
	readonly name: string;
}

export interface Desk {
	readonly glass: Glass<typeof FEATURES>;
	readonly sent: readonly Choice[];
	readonly settings: SubscriptionRef.SubscriptionRef<readonly Setting[]>;
}

const modelOf = (backend: string, model: string, name: string, efforts: readonly string[]): Model => ({
	backend,
	efforts,
	id: `${backend}/${model}`,
	isDefault: true,
	model,
	name,
});

export const CATALOGUE: readonly Model[] = [
	modelOf("claude", "opus", "Opus", ["low", "high"]),
	modelOf("codex", "gpt", "GPT", ["medium"]),
	modelOf("codex", "gpt-mini", "GPT mini", ["medium", "high"]),
];

const settingOf = (choice: Choice): Setting => ({ ...choice, id: `${choice.scope}/${choice.role}` });

const naming = (rows: readonly Setting[], scope: string, roles: readonly string[]): readonly Setting[] =>
	roles.map(
		(role) =>
			rows.find((row) => row.scope === scope && row.role === role) ?? {
				backend: null,
				effort: null,
				id: `${scope}/${role}`,
				model: null,
				role,
				scope,
			},
	);

const scoped = (settings: Desk["settings"], scope: string, roles: readonly string[]) =>
	Stream.map(SubscriptionRef.changes(settings), (rows) => naming(rows, scope, roles));

type Handlers = Record<string, unknown>;

interface LooseGroup {
	readonly toLayer: (handlers: Handlers) => Layer.Layer<Rpc.ToHandler<Rpcs<typeof FEATURES>>>;
}

function looseGroup(built: unknown): LooseGroup;
function looseGroup(built: unknown): unknown {
	return built;
}

const handlersOf = (desk: { readonly sent: Choice[]; readonly settings: Desk["settings"] }): Handlers => {
	let seq = 0;
	const landed = Effect.sync(() => {
		seq += 1;
		return seq;
	});
	return {
		"backends.catalog": (input: { readonly backend: string }) => Stream.make({ backend: input.backend, failure: null }),
		"backends.efforts": (input: { readonly backend: string; readonly model: string }) =>
			Stream.make(CATALOGUE.find((listed) => listed.backend === input.backend && listed.model === input.model)?.efforts ?? []),
		"backends.listModels": () => landed,
		"backends.models": (input: { readonly backend: string }) => Stream.make(CATALOGUE.filter((listed) => listed.backend === input.backend)),
		"roleSettings.choose": (input: Choice) =>
			Effect.gen(function* () {
				desk.sent.push(input);
				yield* SubscriptionRef.update(desk.settings, (rows) => [
					...rows.filter((row) => !(row.scope === input.scope && row.role === input.role)),
					settingOf(input),
				]);
				return yield* landed;
			}),
		"roleSettings.defaults": () => scoped(desk.settings, FLEET, AGENT_ROLES),
		"roleSettings.forVoyage": (input: { readonly voyageId: string }) => scoped(desk.settings, input.voyageId, VOYAGE_AGENT_ROLES),
		"roleSettings.resolve": (input: { readonly role: string }) =>
			Stream.map(SubscriptionRef.changes(desk.settings), (rows) => {
				const standing = rows.find((row) => row.scope === FLEET && row.role === input.role);
				return { backend: standing?.backend ?? "claude", effort: standing?.effort ?? null, model: standing?.model ?? null };
			}),
	};
};

export const desk = (): Desk => {
	const sent: Choice[] = [];
	const settings = Effect.runSync(SubscriptionRef.make<readonly Setting[]>([]));
	const tokens = Layer.merge(
		Layer.provide(layerServer, Layer.succeed(ServerToken, { token: "the-right-token" })),
		Layer.provide(layerClient, Layer.succeed(ClientToken, { token: "the-right-token" })),
	);
	const handlers = looseGroup(group(FEATURES)).toLayer(handlersOf({ sent, settings }));
	const built = Effect.map(RpcTest.makeClient(group(FEATURES), { flatten: true }), (calls) => api(FEATURES, calls)).pipe(
		Effect.provide(Layer.merge(handlers, tokens)),
	);
	return { glass: served(FEATURES, built), sent, settings };
};
