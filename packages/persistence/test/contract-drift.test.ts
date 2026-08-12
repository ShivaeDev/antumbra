import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import committedContract from "#contract.json" with { type: "json" };

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

describe("contract drift", () => {
	it("committed artifacts match a fresh emit of contract.prisma", () => {
		const output = mkdtempSync(join(tmpdir(), "antumbra-contract-emit-"));
		const result = spawnSync(
			join(packageRoot, "node_modules", ".bin", "prisma-next"),
			["contract", "emit", "--no-interactive", "--output-path", output],
			{ cwd: packageRoot, encoding: "utf8" },
		);
		const emitted: unknown = JSON.parse(
			readFileSync(join(output, "contract.json"), "utf8"),
		);
		rmSync(output, { force: true, recursive: true });

		expect(result.status).toBe(0);
		expect(emitted).toMatchObject({
			storage: { storageHash: committedContract.storage.storageHash },
		});
	});

	it("the migration chain reaches the committed contract", () => {
		const migrationRoot = join(packageRoot, "migrations", "app");
		const reachable = readdirSync(migrationRoot).map((directory): unknown =>
			JSON.parse(
				readFileSync(join(migrationRoot, directory, "migration.json"), "utf8"),
			),
		);

		expect(reachable).toContainEqual(
			expect.objectContaining({
				to: committedContract.storage.storageHash,
			}),
		);
	});
});
