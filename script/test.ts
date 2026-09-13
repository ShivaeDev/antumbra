import { fileURLToPath } from "node:url";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Config, Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { localTestLockPath, withTestLock } from "#test/lock.ts";

const reporter = fileURLToPath(new URL("./flakes/adapters/reporter.ts", import.meta.url));

const budget = ["--testTimeout=20000"];

const retried = ["--retry=2", "--reporter=default", `--reporter=${reporter}`];

const vitest = Effect.fnUntraced(function* (settings: readonly string[]) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	return yield* spawner.exitCode(
		ChildProcess.make(
			process.execPath,
			[fileURLToPath(new URL("./vitest.mjs", import.meta.resolve("vitest/package.json"))), "run", ...settings, ...process.argv.slice(2)],
			{ stdin: "inherit", stdout: "inherit", stderr: "inherit" },
		),
	);
});

const program = Effect.fnUntraced(function* () {
	const ci = yield* Config.string("CI").pipe(Config.withDefault(""));
	const settings = ci ? [...budget, ...retried] : budget;
	const exitCode = yield* ci ? vitest(settings) : withTestLock(vitest(settings), yield* localTestLockPath());
	process.exitCode = exitCode;
});

NodeRuntime.runMain(program().pipe(Effect.provide(NodeServices.layer)));
