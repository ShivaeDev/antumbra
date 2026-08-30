import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import committedContract from "#contract.json" with { type: "json" };

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

const MigrationRecord = Schema.Struct({
	from: Schema.NullOr(Schema.String),
	to: Schema.String,
});

const decodeMigration = Schema.decodeUnknownSync(MigrationRecord);

describe("contract drift", () => {
	it("committed artifacts match a fresh emit of contract.prisma", () => {
		const output = mkdtempSync(join(tmpdir(), "antumbra-contract-emit-"));
		const result = spawnSync(
			join(packageRoot, "node_modules", ".bin", "prisma-next"),
			["contract", "emit", "--no-interactive", "--output-path", output],
			{ cwd: packageRoot, encoding: "utf8" },
		);
		const emitted: unknown = JSON.parse(readFileSync(join(output, "contract.json"), "utf8"));
		rmSync(output, { force: true, recursive: true });

		expect(result.status).toBe(0);
		expect(emitted).toMatchObject({
			storage: { storageHash: committedContract.storage.storageHash },
		});
	});

	it("the migration chain is linear and reaches the committed contract", () => {
		const migrationRoot = join(packageRoot, "migrations", "app");
		const chain = readdirSync(migrationRoot)
			.sort()
			.map((directory) => decodeMigration(JSON.parse(readFileSync(join(migrationRoot, directory, "migration.json"), "utf8"))));

		expect(chain[0]?.from).toBeNull();
		for (const [index, migration] of chain.entries()) {
			if (index > 0) {
				expect(migration.from).toBe(chain[index - 1]?.to);
			}
		}
		expect(chain.at(-1)?.to).toBe(committedContract.storage.storageHash);
	});
});
