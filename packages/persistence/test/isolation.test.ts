import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { acquireTemporaryPersistence, temporaryPersistence } from "#testing.ts";

describe("structural isolation", () => {
	it("mints database files only under the OS temp directory", () => {
		const temporary = temporaryPersistence();
		expect(temporary.database.startsWith(tmpdir())).toBe(true);
		temporary.remove();
	});

	it("acquires fresh directories and removes them when their scopes close", () => {
		const acquireDirectory = () =>
			Effect.runSync(
				Effect.scoped(
					Effect.map(acquireTemporaryPersistence, ({ database }) => {
						const directory = dirname(database);
						expect(existsSync(directory)).toBe(true);
						return directory;
					}),
				),
			);

		const first = acquireDirectory();
		const second = acquireDirectory();

		expect(first).not.toBe(second);
		expect(existsSync(first)).toBe(false);
		expect(existsSync(second)).toBe(false);
	});
});
