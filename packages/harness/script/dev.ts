import { dirname } from "node:path";
import { Console, Effect } from "effect";
import { runMain } from "#script/adapters/run.ts";
import { startHarnessServer } from "#script/adapters/vite-server.ts";

const harnessRoot = dirname(import.meta.dirname);
const workspaceRoot = dirname(dirname(harnessRoot));
const HARNESS_PORT = 5184;

const program = Effect.gen(function* () {
	yield* startHarnessServer(harnessRoot, workspaceRoot, HARNESS_PORT);
	yield* Console.log(
		`antumbra harness: the renderer is live on http://localhost:${HARNESS_PORT} against the contract fixtures`,
	);
});

runMain(program);
