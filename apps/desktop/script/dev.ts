import { dirname, join } from "node:path";
import { Console, Effect } from "effect";
import { copyPersistenceAssets } from "./adapters/assets.ts";
import { closeWatcher, watchMainAndPreload } from "./adapters/bundler.ts";
import { spawnElectron, waitForExit } from "./adapters/electron-process.ts";
import { startRendererServer } from "./adapters/renderer-tooling.ts";
import { runMain } from "./adapters/run.ts";

const desktopRoot = dirname(import.meta.dirname);
const workspaceRoot = dirname(dirname(desktopRoot));
const rendererRoot = join(workspaceRoot, "packages", "renderer");
const RENDERER_PORT = 5183;

const restartPending = (): void => {
	Effect.runSync(
		Console.log(
			"core restart pending — main-process bundle rebuilt; quit the app and rerun `pnpm dev` to adopt it",
		),
	);
};

const program = Effect.gen(function* () {
	yield* copyPersistenceAssets(desktopRoot, workspaceRoot);
	yield* startRendererServer(rendererRoot, RENDERER_PORT);
	const watcher = yield* watchMainAndPreload(desktopRoot, restartPending);
	const child = yield* spawnElectron(
		desktopRoot,
		`http://localhost:${RENDERER_PORT}`,
	);
	yield* Console.log(
		"antumbra dev: renderer HMR is live; main-process changes queue and never auto-apply",
	);
	const code = yield* waitForExit(child);
	yield* closeWatcher(watcher);
	yield* Console.log(`electron exited with code ${code}`);
	yield* Effect.sync(() => {
		process.exit(code);
	});
});

runMain(program);
