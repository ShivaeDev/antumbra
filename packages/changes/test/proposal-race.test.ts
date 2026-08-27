import { applyMigrations, Database } from "@antumbra/persistence";
import {
	acquireTemporaryPersistence,
	packagedMigrationsDirectory,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { freezeProposal } from "#change-submissions/proposal.ts";
import { changeOf } from "#test/change-fixtures.ts";

it.live("does not freeze a proposal after a terminal status wins", () =>
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
					name: "hold-first-proposal-freeze",
					beforeExecute(plan) {
						if (
							blocked ||
							plan.ast.kind !== "update" ||
							plan.ast.table.name !== "change" ||
							!("proposalFrozenAt" in plan.ast.set)
						) {
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
			yield* db.Agent.create({
				charter: "chart the race",
				id: "agent-proposal-race",
				role: "crew",
				status: "alive",
			});
			yield* db.Change.create({
				...changeOf({
					headRef: "work/agent-proposal-race/berth-0",
					id: "change-proposal-race",
					repoId: "repo-proposal-race",
					stage: "prepared",
				}),
				body: "original body",
				openedByAgentId: "agent-proposal-race",
				title: "original title",
			});
			yield* Effect.gen(function* () {
				const freezing = yield* Effect.forkScoped(
					freezeProposal("change-proposal-race", "main", {
						base: "release",
						body: "replacement body",
						draft: true,
						title: "replacement title",
					}),
				);
				yield* Effect.promise(() => reached.promise);
				yield* db.Change.where({ id: "change-proposal-race" }).update({
					stage: "withdrawn",
					withdrawnAt: new Date("2026-08-28T00:00:00.000Z"),
				});
				release.resolve();
				const snapshot = yield* Fiber.join(freezing);
				expect(snapshot).toMatchObject({
					body: "original body",
					proposalFrozenAt: null,
					stage: "withdrawn",
					title: "original title",
				});
				const stored = Option.getOrThrow(
					yield* db.Change.where({ id: "change-proposal-race" }).first(),
				);
				expect(stored).toMatchObject({
					body: "original body",
					proposalFrozenAt: null,
					stage: "withdrawn",
					title: "original title",
				});
			}).pipe(Effect.ensuring(Effect.sync(() => release.resolve())));
		}).pipe(Effect.provide(databaseLayer));
	}),
);
