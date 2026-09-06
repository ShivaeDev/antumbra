import process from "node:process";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect } from "effect";
import { makeParentDirectory, runGit } from "#wt/adapters/git.ts";
import { newNameError, usage, worktreePathForRoot } from "#wt/program.ts";

const mainRoot = (cwd: string) =>
	Effect.gen(function* () {
		const porcelain = yield* runGit(["worktree", "list", "--porcelain"], cwd);
		const first = porcelain.split("\n").find((line) => line.startsWith("worktree "));
		if (first === undefined) return yield* Effect.fail(new Error("git worktree list returned no worktree"));
		return first.slice("worktree ".length).trim();
	});

const create = (name: string) =>
	Effect.gen(function* () {
		const root = yield* mainRoot(process.cwd());
		yield* runGit(["fetch", "origin", "main"], root);
		const target = worktreePathForRoot(root, name);
		yield* makeParentDirectory(target);
		yield* runGit(["worktree", "add", target, "-b", name, "origin/main"], root);
		yield* Console.log(target);
	});

const program = Effect.gen(function* () {
	const args = process.argv.slice(2);
	const invalid = newNameError(args);
	const raw = args[1];
	if (invalid !== undefined || raw === undefined) {
		yield* Console.error(invalid ?? usage);
		process.exitCode = 1;
		return;
	}
	yield* create(raw);
}).pipe(
	Effect.catchCause((cause) =>
		Console.error(Cause.pretty(cause)).pipe(
			Effect.tap(() =>
				Effect.sync(() => {
					process.exitCode = 1;
				}),
			),
		),
	),
);

NodeRuntime.runMain(program, { disableErrorReporting: true });
