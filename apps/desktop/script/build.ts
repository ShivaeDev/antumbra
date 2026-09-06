import { dirname, join } from "node:path";
import { Console, Effect } from "effect";
import { copyOpencodePluginAssets, copyPersistenceAssets, copySkillAssets } from "#script/adapters/assets.ts";
import { bundleMainAndPreload } from "#script/adapters/bundler.ts";
import { buildRenderer } from "#script/adapters/renderer-tooling.ts";
import { runMain } from "#script/adapters/run.ts";
import { packageRoot } from "#script/adapters/workspace.ts";

const desktopRoot = dirname(import.meta.dirname);
const rendererRoot = packageRoot("@antumbra/renderer");

const program = Effect.gen(function* () {
	yield* bundleMainAndPreload(desktopRoot);
	yield* buildRenderer(rendererRoot, join(desktopRoot, "out", "renderer"));
	yield* copyPersistenceAssets(desktopRoot);
	yield* copySkillAssets(desktopRoot);
	yield* copyOpencodePluginAssets(desktopRoot);
	yield* Console.log("desktop bundles written to apps/desktop/out");
});

runMain(program);
