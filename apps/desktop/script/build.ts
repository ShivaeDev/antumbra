import { dirname, join } from "node:path";
import { Console, Effect } from "effect";
import { copyPersistenceAssets } from "#script/adapters/assets.ts";
import { bundleMainAndPreload } from "#script/adapters/bundler.ts";
import { buildRenderer } from "#script/adapters/renderer-tooling.ts";
import { runMain } from "#script/adapters/run.ts";

const desktopRoot = dirname(import.meta.dirname);
const workspaceRoot = dirname(dirname(desktopRoot));
const rendererRoot = join(workspaceRoot, "packages", "renderer");
const artifactViewerRoot = join(desktopRoot, "viewer");

const program = Effect.gen(function* () {
	yield* bundleMainAndPreload(desktopRoot);
	yield* buildRenderer(rendererRoot, join(desktopRoot, "out", "renderer"));
	yield* buildRenderer(
		artifactViewerRoot,
		join(desktopRoot, "out", "artifact-viewer"),
	);
	yield* copyPersistenceAssets(desktopRoot, workspaceRoot);
	yield* Console.log("desktop bundles written to apps/desktop/out");
});

runMain(program);
