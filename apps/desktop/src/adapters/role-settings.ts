import { backends } from "@antumbra/backends/feature.ts";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { roleSettings } from "@antumbra/role-settings/feature.ts";
import { FLEET } from "@antumbra/role-settings/ids.ts";
import { type Api, client } from "@antumbra/rpc/client.ts";
import { ClientToken } from "@antumbra/rpc/token.ts";
import { transport } from "@antumbra/rpc/transport.ts";
import {
	type AgentSettingsChoice,
	type ResolvedAgentSettings,
	RoleSettings,
	type RoleSettingsService,
	UNCHOSEN_AGENT_SETTINGS,
	type VoyageAgentSettings,
} from "@antumbra/settings";
import { AgentBackendTagSchema } from "@antumbra/vocabulary/agent-backend.ts";
import type { AgentRole, VoyageAgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { NodeSocket } from "@effect/platform-node";
import { Context, Effect, Layer, Option, Schema, Stream } from "effect";
import { ServerProcess, type Serving } from "#adapters/server-process.ts";

const connecting = client([roleSettings, backends]);

export class ServerReach extends Context.Service<ServerReach, Effect.Success<typeof connecting>>()("@antumbra/desktop/ServerReach") {}

type Reach<Failure> = Api<readonly [typeof roleSettings], Failure>;

type Feeds = Effect.Success<typeof DomainFeeds>;

interface Stored {
	readonly backend: string | null;
	readonly effort: string | null;
	readonly model: string | null;
	readonly role: AgentRole;
}

const once = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value> =>
	Stream.runHead(stream).pipe(
		Effect.flatMap(Option.match({ onNone: () => Effect.die(new Error("the server ended a live query before it answered")), onSome: Effect.succeed })),
		Effect.orDie,
	);

const taggedBackend = Schema.decodeUnknownEffect(Schema.NullOr(AgentBackendTagSchema));

const named = (choice: AgentSettingsChoice) =>
	Effect.map(Effect.orDie(taggedBackend(choice.backend)), (backend) => ({ backend, effort: choice.effort, model: choice.model }));

const choiceOf = (stored: Stored): AgentSettingsChoice => ({ backend: stored.backend, effort: stored.effort, model: stored.model });

const chosenAt = (stored: ReadonlyArray<Stored>, role: AgentRole): AgentSettingsChoice => {
	for (const candidate of stored) {
		if (candidate.role === role) {
			return choiceOf(candidate);
		}
	}
	return UNCHOSEN_AGENT_SETTINGS;
};

const resolvedOf = (answer: { readonly backend: string; readonly effort: string | null; readonly model: string | null }): ResolvedAgentSettings => ({
	backend: answer.backend,
	...(answer.effort === null ? {} : { effort: answer.effort }),
	...(answer.model === null ? {} : { model: answer.model }),
});

const voyageOf = (stored: ReadonlyArray<Stored>): VoyageAgentSettings => ({
	captain: chosenAt(stored, "captain"),
	crew: chosenAt(stored, "crew"),
});

export const roleSettingsOver = <Failure>(reach: Reach<Failure>, feeds: Feeds): RoleSettingsService => ({
	changeDefault: (role: AgentRole, choice: AgentSettingsChoice) =>
		Effect.flatMap(named(choice), (chosen) => Effect.orDie(reach.roleSettings.choose({ ...chosen, role, scope: FLEET }))).pipe(
			Effect.andThen(feeds.publishFleetRefresh()),
		),
	changeForVoyage: (voyageId: string, role: VoyageAgentRole, choice: AgentSettingsChoice) =>
		Effect.flatMap(named(choice), (chosen) => Effect.orDie(reach.roleSettings.choose({ ...chosen, role, scope: voyageId }))).pipe(
			Effect.andThen(feeds.publishVoyageRefresh()),
		),
	defaults: () => Effect.map(once(reach.roleSettings.defaults({})), (stored) => stored.map((row) => ({ ...choiceOf(row), role: row.role }))),
	forVoyages: (voyageIds: ReadonlyArray<string>) =>
		Effect.map(
			Effect.forEach(voyageIds, (voyageId) =>
				Effect.map(once(reach.roleSettings.forVoyage({ voyageId })), (stored) => [voyageId, voyageOf(stored)] as const),
			),
			(entries) => new Map(entries),
		),
	resolve: (voyageId: string | null, role: AgentRole) => Effect.map(once(reach.roleSettings.resolve({ role, voyageId })), resolvedOf),
});

export const addressOf = (serving: Effect.Effect<Serving>): Effect.Effect<string> => Effect.map(serving, ({ port }) => `ws://127.0.0.1:${port}/rpc`);

const dialing = (serving: Effect.Effect<Serving>, token: string) =>
	Layer.provide(transport, Layer.merge(NodeSocket.layerWebSocket(addressOf(serving)), Layer.succeed(ClientToken, { token })));

const reaching = (serving: Effect.Effect<Serving>, token: string) =>
	Layer.effect(ServerReach)(connecting).pipe(Layer.provide(dialing(serving, token)));

export const RoleSettingsOverRpc: Layer.Layer<RoleSettings | ServerReach, never, Context.Service.Identifier<typeof DomainFeeds> | ServerProcess> =
	Layer.unwrap(
		Effect.gen(function* () {
			const { serving } = yield* ServerProcess;
			const { token } = yield* serving;
			return Layer.effect(RoleSettings)(
				Effect.gen(function* () {
					const feeds = yield* DomainFeeds;
					return roleSettingsOver(yield* ServerReach, feeds);
				}),
			).pipe(Layer.provideMerge(reaching(serving, token)));
		}),
	);
