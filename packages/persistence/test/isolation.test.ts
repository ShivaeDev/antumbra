import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { temporaryPersistence } from "../src/testing.js";

describe("structural isolation", () => {
	it("mints database files only under the OS temp directory", () => {
		const temporary = temporaryPersistence();
		expect(temporary.database.startsWith(tmpdir())).toBe(true);
		temporary.remove();
	});

	it("offers no way to aim the harness at a live data directory", () => {
		// @ts-expect-error the harness takes no arguments; a target path cannot be injected
		const temporary = temporaryPersistence("/tmp/somewhere-live");
		expect(temporary.database.startsWith(tmpdir())).toBe(true);
		temporary.remove();
	});
});
