import { fileURLToPath } from "node:url";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Config, Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { localTestLockPath, withTestLock } from "#test/lock.ts";

const vitest = Effect.fnUntraced(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	return yield* spawner.exitCode(
		ChildProcess.make(
			process.execPath,
			[fileURLToPath(new URL("./vitest.mjs", import.meta.resolve("vitest/package.json"))), "run", ...process.argv.slice(2)],
			{ stdin: "inherit", stdout: "inherit", stderr: "inherit" },
		),
	);
});

const program = Effect.fnUntraced(function* () {
	const ci = yield* Config.string("CI").pipe(Config.withDefault(""));
	const exitCode = yield* ci ? vitest() : withTestLock(vitest(), yield* localTestLockPath());
	process.exitCode = exitCode;
});

NodeRuntime.runMain(program().pipe(Effect.provide(NodeServices.layer)));
