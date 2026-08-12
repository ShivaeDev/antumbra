import { describe, expect, it } from "vitest";
import { patternViolations } from "#lint/rules/patterns.ts";
import cases from "#test/fixtures/pattern-cases.json" with { type: "json" };
import { inventoryOf } from "#test/support/inventory.ts";

const SEEDED_PATH = "packages/x/src/mod.ts";

describe("pattern rules", () => {
	for (const seeded of cases.flagged) {
		it(`flags ${seeded.name}`, () => {
			const violations = patternViolations(
				inventoryOf({
					sources: [{ content: seeded.content, path: SEEDED_PATH }],
				}),
			);
			const hit = violations.find(
				(violation) => violation.rule === `patterns/${seeded.rule}`,
			);
			expect(hit?.message).toContain(seeded.needle);
			expect(hit?.file).toBe(SEEDED_PATH);
		});
	}

	for (const seeded of cases.allowed) {
		it(`allows ${seeded.name}`, () => {
			expect(patternViolations(inventoryOf({ sources: seeded.files }))).toEqual(
				[],
			);
		});
	}

	it("points at the offending line", () => {
		const violations = patternViolations(
			inventoryOf({
				sources: [{ content: cases.lineReport.content, path: SEEDED_PATH }],
			}),
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.line).toBe(cases.lineReport.line);
		expect(violations[0]?.rule).toBe(`patterns/${cases.lineReport.rule}`);
	});
});
