import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { makeBackendCapacityController } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Clock, Effect, Option } from "effect";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	rawOf,
} from "#test/harness.ts";
import { eventually, sightLayer, spawnRequest } from "#test/sight-fixture.ts";

it.live("retrying a paused provider resumes every parked birth", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const capacity = yield* makeBackendCapacityController((raw) =>
			raw.kind === "quota/rejected"
				? Option.some({
						detail: "scripted quota exhausted",
						reason: "usage-limit" as const,
						status: "blocked" as const,
					})
				: Option.none(),
		);
		capacity.observe(rawOf("quota/rejected"), yield* Clock.currentTimeMillis);
		const held = {
			...scripted,
			backend: { ...scripted.backend, capacity: capacity.source },
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const sight = yield* SightSource;
			yield* sight.spawn(spawnRequest);
			yield* sight.spawn({ ...spawnRequest, role: "surveyor" });
			yield* eventually(
				Effect.gen(function* () {
					const births = yield* db.Intent.where({ tag: "agent/spawn" }).all();
					expect(births.map((birth) => birth.status)).toEqual([
						"waiting",
						"waiting",
					]);
				}),
			);
			yield* db.Intent.create({
				detail: "runner authentication required",
				id: "unrelated-wait",
				payload: JSON.stringify({
					agentId: "agent-unrelated",
					backend: "scripted",
					charter: "wait for credentials",
					role: "navigator",
					runner: "local",
					sessionId: "session-unrelated",
				}),
				status: "waiting",
				tag: "agent/spawn",
			});

			yield* sight.retryBackend("scripted");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
					expect((yield* sight.fleet).capacities).toEqual([
						expect.objectContaining({
							backend: "scripted",
							status: "available",
						}),
					]);
				}),
			);
			expect(
				Option.getOrThrow(
					yield* db.Intent.where({ id: "unrelated-wait" }).first(),
				).status,
			).toBe("waiting");
		}).pipe(Effect.provide(sightLayer(temporary, held)));
	}),
);
