import { applyMigrations, Database } from "@antumbra/persistence";
import {
	packagedMigrationsDirectory,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { afterAll } from "vitest";
import { BoardScope } from "#model.ts";
import { linkedBoardId } from "#owner.ts";

const temporary = temporaryPersistence();
const observedRows: Array<Record<string, unknown>> = [];

afterAll(temporary.remove);

const databaseLayer = Database.layer({
	path: temporary.database,
	middleware: [
		{
			name: "observe-board-link-projection",
			onRow(row) {
				observedRows.push(row);
				return Promise.resolve();
			},
		},
	],
});

it.effect("requests only the Board id consumed by a link lookup", () =>
	Effect.gen(function* () {
		yield* applyMigrations({
			database: temporary.database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		const db = yield* Database;
		yield* db.BoardOwner.create({
			boardId: "board-projection",
			ownerId: "agent-projection",
			ownerKind: "agent",
		});

		observedRows.length = 0;
		expect(
			yield* linkedBoardId(BoardScope.Agent({ agentId: "agent-projection" })),
		).toEqual(Option.some("board-projection"));
		expect(observedRows).toEqual([{ boardId: "board-projection" }]);
	}).pipe(Effect.provide(databaseLayer)),
);
