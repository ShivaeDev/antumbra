import { join } from "node:path";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Config, Console, Effect, FileSystem } from "effect";
import { commentOnIssue, ensureLabel, openIssue, openIssues } from "#flakes/adapters/gh.ts";
import { directory } from "#flakes/adapters/reporter.ts";
import { body, comment, decodeRecording, flakes, label, type Recorded, title } from "#flakes/report.ts";

const reports = Effect.fnUntraced(function* () {
	const fs = yield* FileSystem.FileSystem;
	if (!(yield* fs.exists(directory))) return [];
	const found: string[] = [];
	for (const name of yield* fs.readDirectory(directory)) {
		const path = join(directory, name);
		const info = yield* fs.stat(path);
		if (info.type !== "Directory") {
			if (name.endsWith(".json")) found.push(path);
			continue;
		}
		for (const inner of yield* fs.readDirectory(path)) {
			if (inner.endsWith(".json")) found.push(join(path, inner));
		}
	}
	return found;
});

const recording = Effect.fnUntraced(function* () {
	const fs = yield* FileSystem.FileSystem;
	const recorded: Recorded[] = [];
	for (const path of yield* reports()) {
		recorded.push(...decodeRecording(yield* fs.readFileString(path)));
	}
	return recorded;
});

const workflowRun = Effect.fnUntraced(function* () {
	const repository = yield* Config.string("GITHUB_REPOSITORY").pipe(Config.withDefault(""));
	const runId = yield* Config.string("GITHUB_RUN_ID").pipe(Config.withDefault(""));
	const server = yield* Config.string("GITHUB_SERVER_URL").pipe(Config.withDefault("https://github.com"));
	return repository === "" || runId === "" ? undefined : `${server}/${repository}/actions/runs/${runId}`;
});

const report = Effect.fnUntraced(function* (found: readonly Recorded[], run: string) {
	yield* ensureLabel(label);
	const open = yield* openIssues(label);
	for (const test of found) {
		const existing = open.find((issue) => issue.title === title(test));
		if (existing === undefined) {
			const opened = yield* openIssue(label, title(test), body(test, run));
			yield* Console.log(`Opened ${opened.trim()}`);
			continue;
		}
		const posted = yield* commentOnIssue(existing.number, comment(test, run));
		yield* Console.log(`Commented on ${posted.trim()}`);
	}
});

const program = Effect.fnUntraced(function* () {
	const found = flakes(yield* recording());
	if (found.length === 0) return yield* Console.log("No test both failed and passed within its runs.");
	const run = yield* workflowRun();
	for (const test of found) {
		yield* Console.log(`${title(test)}\n\n${body(test, run ?? "unknown")}\n`);
	}
	if (run === undefined) return yield* Console.log("No workflow run in the environment; nothing was opened.");
	yield* report(found, run);
});

NodeRuntime.runMain(program().pipe(Effect.provide(NodeServices.layer)));
