import { describe, expect, it } from "vitest";
import { layoutFeatureFolderViolations } from "#lint/rules/layout-feature-folders.ts";
import type { SeedFile } from "#test/support/inventory.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const holding = (path: string): SeedFile => ({ content: "export {};\n", path });

const check = (...paths: readonly string[]) =>
	layoutFeatureFolderViolations(inventoryOf({ sources: paths.map(holding) })).map(({ message }) => message);

const SHAPE = "a domain holds rows, facts, commands, materializers and queries, one file deep, beside feature.ts and ids.ts, and nothing else";

describe("feature-folders rule", () => {
	it("lets a domain hold the five folders and its two files", () => {
		expect(
			check(
				"packages/server/domains/pieces/src/feature.ts",
				"packages/server/domains/pieces/src/ids.ts",
				"packages/server/domains/pieces/src/rows/piece.ts",
				"packages/server/domains/pieces/src/facts/piece-parked.ts",
				"packages/server/domains/pieces/src/commands/park.ts",
				"packages/server/domains/pieces/src/materializers/piece-parked.ts",
				"packages/server/domains/pieces/src/queries/by-voyage.ts",
			),
		).toEqual([]);
	});

	it("refuses another file directly under src", () => {
		expect(check("packages/server/domains/pieces/src/shared.ts")).toEqual([`@antumbra/pieces may not hold src/shared.ts: ${SHAPE}.`]);
	});

	it("refuses another folder and a folder nested inside one of the five", () => {
		expect(check("packages/server/domains/pieces/src/reconcilers/admission.ts")).toEqual([
			`@antumbra/pieces may not hold src/reconcilers/admission.ts: ${SHAPE}.`,
		]);
		expect(check("packages/server/domains/pieces/src/rows/nested/piece.ts")).toEqual([
			`@antumbra/pieces may not hold src/rows/nested/piece.ts: ${SHAPE}.`,
		]);
	});

	it("leaves a domain's tests and every package outside the domains alone", () => {
		expect(check("packages/server/domains/pieces/test/park.test.ts")).toEqual([]);
		expect(check("packages/server/journal/src/commit.ts")).toEqual([]);
		expect(check("packages/kernel/src/run.ts")).toEqual([]);
	});
});
