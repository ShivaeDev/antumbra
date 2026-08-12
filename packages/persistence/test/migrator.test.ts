import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterAll, expect } from "vitest";
import { applyMigrations } from "../src/adapters/migrator.js";
import { brandDatabaseFilePath } from "../src/data-dir.js";
import fixtureContract from "./fixtures/contract.json" with { type: "json" };
import stepOneContract from "./fixtures/migrations/app/20260812T0956_init/end-contract.json" with {
	type: "json",
};

const migrationsDirectory = fileURLToPath(
	new URL("./fixtures/migrations", import.meta.url),
);

const directories: string[] = [];

afterAll(() => {
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const freshDatabase = () => {
	const directory = mkdtempSync(join(tmpdir(), "antumbra-migrator-"));
	directories.push(directory);
	return brandDatabaseFilePath(join(directory, "test.db"));
};

it.effect("applies the full chain to a fresh database", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		const report = yield* applyMigrations({
			contract: fixtureContract,
			database,
			migrationsDirectory,
		});
		expect(report.applied).toEqual([
			"20260812T0956_init",
			"20260812T0956_add_weight",
		]);
	}),
);

it.effect("applies only pending migrations to an existing database", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		const first = yield* applyMigrations({
			contract: stepOneContract,
			database,
			migrationsDirectory,
		});
		expect(first.applied).toEqual(["20260812T0956_init"]);

		const second = yield* applyMigrations({
			contract: fixtureContract,
			database,
			migrationsDirectory,
		});
		expect(second.applied).toEqual(["20260812T0956_add_weight"]);
	}),
);

it.effect("does nothing once the database is up to date", () =>
	Effect.gen(function* () {
		const database = freshDatabase();
		yield* applyMigrations({
			contract: fixtureContract,
			database,
			migrationsDirectory,
		});
		const rerun = yield* applyMigrations({
			contract: fixtureContract,
			database,
			migrationsDirectory,
		});
		expect(rerun.applied).toEqual([]);
	}),
);

it.effect(
	"fails as a typed error when the chain cannot reach the contract",
	() =>
		Effect.gen(function* () {
			const database = freshDatabase();
			const failure = yield* Effect.flip(
				applyMigrations({
					contract: fixtureContract,
					database,
					migrationsDirectory: fileURLToPath(
						new URL("./fixtures", import.meta.url),
					),
				}),
			);
			expect(failure._tag).toBe("MigrationFailure");
		}),
);
