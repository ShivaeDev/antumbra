import { dirname, join } from "node:path";
import { Console, Effect } from "effect";
import { copyOpencodePluginAssets, copySkillAssets } from "#script/adapters/assets.ts";
import { bundleMainAndPreload } from "#script/adapters/bundler.ts";
import { buildRenderer } from "#script/adapters/renderer-tooling.ts";
import { runMain } from "#script/adapters/run.ts";

const desktopRoot = dirname(import.meta.dirname);

const program = Effect.gen(function* () {
	yield* bundleMainAndPreload(desktopRoot);
	yield* buildRenderer(desktopRoot, join(desktopRoot, "out", "renderer"));
	yield* copySkillAssets(desktopRoot);
	yield* copyOpencodePluginAssets(desktopRoot);
	yield* Console.log("desktop bundles written to apps/desktop/out");
});

runMain(program);
