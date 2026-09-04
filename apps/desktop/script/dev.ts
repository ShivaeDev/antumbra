import { dirname, join } from "node:path";
import { Console, Effect } from "effect";
import { exitAsksForRestart } from "#restart-exit-code.ts";
import { copyPersistenceAssets } from "#script/adapters/assets.ts";
import { closeWatcher, watchMainAndPreload } from "#script/adapters/bundler.ts";
import { spawnElectron, waitForExit } from "#script/adapters/electron-process.ts";
import { startRendererServer, stopRendererServer } from "#script/adapters/renderer-tooling.ts";
import { runMain } from "#script/adapters/run.ts";

const desktopRoot = dirname(import.meta.dirname);
const workspaceRoot = dirname(dirname(desktopRoot));
const rendererRoot = join(workspaceRoot, "packages", "renderer");
const RENDERER_PORT = 5183;

const restartPending = (): void => {
	Effect.runSync(Console.log("core restart pending — main-process bundle rebuilt; restart the app to adopt it"));
};

const runIteration = (iteration: number) =>
	Effect.gen(function* () {
		yield* copyPersistenceAssets(desktopRoot, workspaceRoot);
		const server = yield* startRendererServer(rendererRoot, RENDERER_PORT);
		const watcher = yield* watchMainAndPreload(desktopRoot, restartPending);
		const child = yield* spawnElectron(desktopRoot, `http://localhost:${RENDERER_PORT}`);
		yield* Console.log(`antumbra dev: iteration ${iteration} — renderer HMR is live; main-process changes apply on the next restart`);
		const code = yield* waitForExit(child);
		yield* closeWatcher(watcher);
		yield* stopRendererServer(server);
		return code;
	});

const runUntilElectronStays = (iteration: number): Effect.Effect<number, unknown> =>
	runIteration(iteration).pipe(Effect.flatMap((code) => (exitAsksForRestart(code) ? runUntilElectronStays(iteration + 1) : Effect.succeed(code))));

const program = Effect.gen(function* () {
	const code = yield* runUntilElectronStays(1);
	yield* Console.log(`electron exited with code ${code}`);
	yield* Effect.sync(() => {
		process.exit(code);
	});
});

runMain(program);
