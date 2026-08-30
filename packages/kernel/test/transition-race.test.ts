import { applyMigrations, Database } from "@antumbra/persistence";
import { acquireTemporaryPersistence, packagedMigrationsDirectory } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { transitionRow } from "#transitions.ts";

it.live("re-reads the winner after a competing status update", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
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
					name: "hold-first-intent-status-update",
					beforeExecute(plan) {
						if (blocked || plan.ast.kind !== "update" || plan.ast.table.name !== "intent" || !("status" in plan.ast.set)) {
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
			yield* db.Intent.create({
				detail: null,
				id: "intent-race",
				payload: "{}",
				status: "queued",
				tag: "test/race",
			});
			yield* Effect.gen(function* () {
				const stale = yield* Effect.forkScoped(transitionRow("intent-race", "admit"));
				yield* Effect.promise(() => reached.promise);
				expect(yield* transitionRow("intent-race", "cancel")).toEqual({
					id: "intent-race",
					status: "cancelled",
				});
				release.resolve();
				const failure = yield* Fiber.join(stale).pipe(Effect.flip);
				expect(failure).toMatchObject({
					_tag: "InvalidTransition",
					event: "admit",
					from: "cancelled",
				});
				expect((yield* db.Intent.where({ id: "intent-race" }).first()).pipe(Option.getOrThrow).status).toBe("cancelled");
			}).pipe(Effect.ensuring(Effect.sync(() => release.resolve())));
		}).pipe(Effect.provide(databaseLayer));
	}),
);
