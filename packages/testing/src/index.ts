import { dirname, join } from "node:path";
import { applicationLayers } from "@antumbra/domain";
import { Database } from "@antumbra/persistence";
import { AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { RoleSettings } from "@antumbra/settings";
import { makeEffectApp, makeScriptedBackend, passiveRunner, scriptedRoleSettings, scriptedSettings, scriptedVoyages } from "@antumbra/testing-runtime";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";

interface Providers {
	readonly backends?: ReadonlyMap<string, AgentBackend>;
	readonly runners?: ReadonlyMap<string, Runner>;
	readonly changeHosts?: ReadonlyMap<string, ChangeHost>;
}

export const it = {
	effectApp: makeEffectApp((temporary, providers: Providers = {}) =>
		Effect.gen(function* () {
			const scripted = yield* makeScriptedBackend;
			const directory = dirname(temporary.database);
			const backends = providers.backends ?? new Map([[scripted.backend.tag, scripted.backend]]);
			const [sailsOn = scripted.backend.tag] = [...backends.keys()];
			const harness = Effect.gen(function* () {
				return { db: yield* Database, scripted };
			});
			const fleetSailsOn = Layer.effectDiscard(
				Effect.flatMap(RoleSettings, (roles) =>
					Effect.forEach(AGENT_ROLES, (role) => roles.changeDefault(role, { backend: sailsOn, effort: null, model: null })),
				),
			).pipe(Layer.orDie);
			const layer = fleetSailsOn.pipe(
				Layer.provideMerge(
					applicationLayers(
						backends,
						providers.runners ?? new Map([[passiveRunner.tag, passiveRunner]]),
						providers.changeHosts ?? new Map(),
						join(directory, "artifacts"),
						join(directory, "session-inputs"),
					).pipe(Layer.provide(NodeServices.layer), Layer.orDie),
				),
				Layer.provideMerge(scriptedVoyages.pipe(Layer.provideMerge(Layer.mergeAll(scriptedRoleSettings, scriptedSettings)))),
			);
			return { harness, layer };
		}),
	),
};

export { endsTurn } from "@antumbra/testing-runtime";
