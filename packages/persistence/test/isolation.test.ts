import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { temporaryPersistence } from "#testing.ts";

describe("structural isolation", () => {
	it("mints database files only under the OS temp directory", () => {
		const temporary = temporaryPersistence();
		expect(temporary.database.startsWith(tmpdir())).toBe(true);
		temporary.remove();
	});
});
