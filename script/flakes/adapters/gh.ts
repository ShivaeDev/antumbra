import { Effect, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

const Issues = Schema.Array(Schema.Struct({ number: Schema.Number, title: Schema.String }));

const decodeIssues = Schema.decodeUnknownSync(Schema.fromJsonString(Issues));

const gh = (args: readonly string[]) => ChildProcess.make("gh", [...args]);

const spoken = Effect.fnUntraced(function* (args: readonly string[]) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	return yield* spawner.string(gh(args));
});

export const ensureLabel = Effect.fnUntraced(function* (label: string) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const description = "A test that failed and passed within one CI run";
	yield* spawner.exitCode(gh(["label", "create", label, "--description", description, "--color", "d93f0b", "--force"]));
});

export const openIssues = (label: string) =>
	Effect.map(spoken(["issue", "list", "--label", label, "--state", "open", "--json", "number,title", "--limit", "200"]), decodeIssues);

export const openIssue = (label: string, title: string, body: string) =>
	spoken(["issue", "create", "--title", title, "--body", body, "--label", label]);

export const commentOnIssue = (issue: number, body: string) => spoken(["issue", "comment", String(issue), "--body", body]);
