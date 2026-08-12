import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";

const SKIPPED = new Set([".git", "dist", "node_modules", "out"]);

const walkSync = (dir: string): readonly string[] => {
	let entries: readonly string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return [];
	}
	return entries.flatMap((entry) => {
		if (SKIPPED.has(entry)) {
			return [];
		}
		const full = join(dir, entry);
		return statSync(full).isDirectory() ? walkSync(full) : [full];
	});
};

export const walk = (dir: string): Effect.Effect<readonly string[]> =>
	Effect.sync(() => walkSync(dir));

export const readText = (path: string): Effect.Effect<string> =>
	Effect.sync(() => {
		try {
			return readFileSync(path, "utf8");
		} catch {
			return "";
		}
	});
