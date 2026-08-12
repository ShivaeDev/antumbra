import { dirname, join } from "node:path";
import { Console, Effect } from "effect";
import { bundleMainAndPreload } from "./adapters/bundler.ts";
import { buildRenderer } from "./adapters/renderer-tooling.ts";
import { runMain } from "./adapters/run.ts";

const desktopRoot = dirname(import.meta.dirname);
const workspaceRoot = dirname(dirname(desktopRoot));
const rendererRoot = join(workspaceRoot, "packages", "renderer");

const program = Effect.gen(function* () {
	yield* bundleMainAndPreload(desktopRoot);
	yield* buildRenderer(rendererRoot, join(desktopRoot, "out", "renderer"));
	yield* Console.log("desktop bundles written to apps/desktop/out");
});

runMain(program);
