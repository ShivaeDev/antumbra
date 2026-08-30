import { applyMigrations, Database } from "@antumbra/persistence";
import { acquireTemporaryPersistence, packagedMigrationsDirectory } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Option } from "effect";
import { Changes } from "#change-submissions/service.ts";
import { changeOf } from "#test/change-fixtures.ts";
import { changesLayer, makeScriptedHost, observation } from "#test/change-harness.ts";

const competingObservation = Effect.gen(function* () {
	const temporary = yield* acquireTemporaryPersistence;
	const scripted = yield* makeScriptedHost;
	yield* applyMigrations({
		database: temporary.database,
		migrationsDirectory: packagedMigrationsDirectory,
	});
	const reached = Promise.withResolvers<void>();
	const release = Promise.withResolvers<void>();
	let blocked = false;
	const databaseLayer = Database.layer({
		path: temporary.database,
		middleware: [
			{
				name: "hold-first-observation-projection",
				beforeExecute(plan) {
					if (blocked || plan.ast.kind !== "update" || plan.ast.table.name !== "change" || !("observedAt" in plan.ast.set)) {
						return;
					}
					blocked = true;
					reached.resolve();
					return release.promise;
				},
			},
		],
	});
	yield* Effect.gen(function* () {
		const db = yield* Database;
		const changes = yield* Changes;
		const initial = {
			...changeOf({
				headRef: "work/agent-race/berth-0",
				id: "change-observation-race",
				repoId: "repo-observation-race",
				stage: "open",
			}),
			externalId: "1",
		};
		yield* db.Change.create(initial);
		yield* Effect.gen(function* () {
			const applying = yield* Effect.forkScoped(
				changes.observed("scripted", [
					observation(
						"1",
						{
							baseRef: initial.baseRef,
							headRef: initial.headRef,
							repoId: initial.repoId,
							title: initial.title,
						},
						{
							activityAt: initial.activityAt.getTime() + 1,
							stage: "landed",
						},
					),
				]),
			);
			yield* Effect.promise(() => reached.promise);
			yield* db.Change.where({ id: initial.id }).update({
				stage: "withdrawn",
				withdrawnAt: new Date("2026-08-28T00:00:00.000Z"),
			});
			release.resolve();
			const [winner] = yield* Fiber.join(applying);
			expect(winner?.stage).toBe("withdrawn");
			expect(Option.getOrThrow(yield* db.Change.where({ id: initial.id }).first()).stage).toBe("withdrawn");
			expect(yield* db.ChangeTransition.all()).toEqual([]);
		}).pipe(Effect.ensuring(Effect.sync(() => release.resolve())));
	}).pipe(Effect.provide(changesLayer([scripted.host]).pipe(Layer.provideMerge(databaseLayer))));
});

it.live("retries an observation from a competing terminal winner", () => competingObservation);
