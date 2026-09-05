import { dirname, join } from "node:path";
import { applicationLayers } from "@antumbra/domain";
import { Database } from "@antumbra/persistence";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { makeEffectApp, makeScriptedBackend, passiveRunner, rawOf, type ScriptedBackend } from "@antumbra/testing-runtime";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer, Option, Schedule } from "effect";

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

export const endsTurn = (scripted: ScriptedBackend, sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const session = yield* scripted.session(sessionId);
		if (session === undefined) {
			return yield* Effect.die(`the session was never opened: ${sessionId}`);
		}
		yield* session.emit({ durationMs: 1, raw: rawOf("turn/completed"), status: "completed", type: "turn.completed" });
		yield* Effect.gen(function* () {
			const row = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.getOrThrow(row).executionStatus !== "idle") {
				return yield* Effect.fail("the session is still working");
			}
		}).pipe(Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))), Effect.orDie);
	});
