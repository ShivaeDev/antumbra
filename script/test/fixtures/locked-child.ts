import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { withTestLock } from "#test/lock.ts";

const path = Schema.decodeUnknownSync(Schema.String)(process.argv[2]);
const body = Effect.fnUntraced(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	return yield* spawner.exitCode(
		ChildProcess.make(
			process.execPath,
			[
				"-e",
				`
		process.on("SIGTERM", () => process.stdout.write("stopping\\n"));
		process.stdin.on("data", () => process.exit(7));
		process.stdout.write("acquired\\n");
	`,
			],
			{ stdin: "inherit", stdout: "inherit", stderr: "inherit" },
		),
	);
});

NodeRuntime.runMain(
	withTestLock(body(), path).pipe(
		Effect.tap((code) =>
			Effect.sync(() => {
				process.exitCode = code;
			}),
		),
		Effect.provide(NodeServices.layer),
	),
);
