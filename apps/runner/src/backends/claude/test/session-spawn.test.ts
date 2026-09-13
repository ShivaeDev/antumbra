import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { Config, Effect, Option, Schema, Stream } from "effect";
import { claudeBackend } from "#backends/claude/backend.ts";

const decodeSpawn = Schema.decodeUnknownSync(
	Schema.fromJsonString(
		Schema.Struct({
			argv: Schema.Array(Schema.String),
			env: Schema.Record(Schema.String, Schema.String),
		}),
	),
);

const workspace = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-claude-spawn-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

// The SDK hands an executable whose name ends in .mjs to Node, so the stand-in CLI needs no shell wrapper.
const fakeExecutable = (root: string, record: string): string => {
	const path = join(root, "claude.mjs");
	const source = `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(record)}, JSON.stringify({ argv: process.argv.slice(2), env: process.env }));
`;
	writeFileSync(path, source);
	return path;
};

const settingsFlag = (argv: ReadonlyArray<string>): ReadonlyArray<string> => {
	const at = argv.indexOf("--settings");
	return argv.slice(at, at + 2);
};

it.live("the CLI a session runs on is started with session state events on and the runner's own environment", () =>
	Effect.gen(function* () {
		const root = yield* workspace;
		const record = join(root, "spawn.json");
		const backend = yield* claudeBackend({ executable: fakeExecutable(root, record), skills: join(root, "skills") });
		const handle = yield* backend.openSession({
			cwd: root,
			effort: Option.none(),
			model: "claude-opus-5",
			resume: Option.none(),
			sessionId: "session-1",
			tools: [],
		});
		yield* Stream.runDrain(handle.events);

		const spawned = decodeSpawn(readFileSync(record, "utf8"));
		expect(settingsFlag(spawned.argv)).toEqual(["--settings", JSON.stringify({ env: { CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS: "1" } })]);
		expect(spawned.env.PATH).toBe(yield* Config.string("PATH"));
		expect(spawned.env.HOME).toBe(yield* Config.string("HOME"));
	}).pipe(Effect.scoped),
);
