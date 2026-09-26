import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Effect, FileSystem, Result } from "effect";
import { keyOf, type Target, type Until } from "#pr/command.ts";
import { decodeMemory, forgotten, type Memory } from "#pr/memory.ts";

const nameLimit = 200;

export const statePath = (targets: readonly Target[], repos: readonly string[], until: Until, home: string = homedir()): string => {
	const watched = [...repos, ...targets.map(keyOf)]
		.toSorted()
		.join("+")
		.replaceAll(/[^\w.+-]/g, "_");
	const name = watched.length > nameLimit ? createHash("sha256").update(watched).digest("hex") : watched;
	return join(home, ".antumbra", "pr-watch", `${name}${until === "ci" ? ".ci" : ""}.json`);
};

export const load = (path: string): Effect.Effect<Memory, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		if (!(yield* fs.exists(path))) return forgotten;
		return yield* Result.match(decodeMemory(yield* fs.readFileString(path)), {
			onFailure: (message) => Effect.fail(new Error(`cannot read the watch state in ${path}: ${message}`)),
			onSuccess: (memory) => Effect.succeed(memory),
		});
	});

export const save = (path: string, encoded: string): Effect.Effect<void, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const draft = `${path}.tmp`;
		yield* fs.makeDirectory(dirname(path), { recursive: true });
		yield* fs.writeFileString(draft, encoded);
		yield* fs.rename(draft, path);
	});
