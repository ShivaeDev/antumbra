import { DomainFeeds } from "@antumbra/domain-feeds";
import type { roleSettings } from "@antumbra/role-settings/feature.ts";
import { FLEET } from "@antumbra/role-settings/ids.ts";
import type { Api } from "@antumbra/rpc/client.ts";
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
import { type Context, Effect, Layer, Schema } from "effect";
import { once, ServerReach } from "#adapters/server-reach.ts";

type Reach<Failure> = Api<readonly [typeof roleSettings], Failure>;

type Feeds = Effect.Success<typeof DomainFeeds>;

interface Stored {
	readonly backend: string | null;
	readonly effort: string | null;
	readonly model: string | null;
	readonly role: AgentRole;
}

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

export const RoleSettingsOverRpc: Layer.Layer<RoleSettings, never, Context.Service.Identifier<typeof DomainFeeds> | ServerReach> = Layer.effect(
	RoleSettings,
)(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		return roleSettingsOver(yield* ServerReach, feeds);
	}),
);
