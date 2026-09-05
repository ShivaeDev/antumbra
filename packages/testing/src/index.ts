import { dirname, join } from "node:path";
import { applicationLayers } from "@antumbra/domain";
import { Database } from "@antumbra/persistence";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { makeEffectApp, makeScriptedBackend, passiveRunner } from "@antumbra/testing-runtime";
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
			const harness = Effect.gen(function* () {
				return { db: yield* Database, scripted };
			});
			const layer = applicationLayers(
				providers.backends ?? new Map([[scripted.backend.tag, scripted.backend]]),
				providers.runners ?? new Map([[passiveRunner.tag, passiveRunner]]),
				providers.changeHosts ?? new Map(),
				join(directory, "artifacts"),
				join(directory, "session-inputs"),
			).pipe(Layer.provide(NodeServices.layer), Layer.orDie);
			return { harness, layer };
		}),
	),
};

export { endsTurn } from "@antumbra/testing-runtime";
