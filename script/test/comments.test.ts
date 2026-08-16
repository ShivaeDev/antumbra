import { describe, expect, it } from "vitest";
import { commentViolations } from "#lint/rules/comments.ts";
import rawCases from "#test/fixtures/comment-cases.json" with { type: "json" };
import { decodeCommentCases } from "#test/support/fixture-schemas.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const defaultPath = "packages/x/src/mod.ts";
const cases = decodeCommentCases(rawCases);

describe("comment rules", () => {
	for (const seeded of cases.allowed) {
		it(`allows ${seeded.name}`, () => {
			expect(
				commentViolations(
					inventoryOf({
						sources: [{ content: seeded.content, path: seeded.path }],
					}),
				),
			).toEqual([]);
		});
	}

	for (const seeded of cases.flagged) {
		it(`flags ${seeded.name}`, () => {
			const path = seeded.path ?? defaultPath;
			const violations = commentViolations(
				inventoryOf({ sources: [{ content: seeded.content, path }] }),
			);
			const hit = violations.find(
				(violation) => violation.rule === `comments/${seeded.rule}`,
			);
			expect(hit?.file).toBe(path);
			expect(hit?.line).toBe(seeded.line);
		});
	}
});
