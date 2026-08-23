import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_SESSION_IMAGES } from "@antumbra/vocabulary/session-input";
import { expect, it } from "@effect/vitest";

// why: a migration is a historical fact and may not import a constant that can
// still change, so the image ceiling is written twice — once as the number this
// process enforces and once as the number the database refuses past. Two
// statements of one rule drift silently unless something reads both, so this
// reads both.
const guardsRoot = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../persistence/migrations/app",
);

const IMAGE_CEILING = /'image'\)\s*<\s*(\d+)/g;

const guardSources = () =>
	readdirSync(guardsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(guardsRoot, entry.name, "guards.ts"))
		.flatMap((path) => {
			try {
				return [readFileSync(path, "utf8")];
			} catch {
				return [];
			}
		});

it("the durable image ceiling is the one the vocabulary declares", () => {
	const ceilings = guardSources().flatMap((source) =>
		[...source.matchAll(IMAGE_CEILING)].map(([, limit]) => Number(limit)),
	);
	expect(ceilings).not.toHaveLength(0);
	for (const ceiling of ceilings) {
		expect(ceiling).toBe(MAX_SESSION_IMAGES);
	}
});
