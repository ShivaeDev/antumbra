import { join } from "node:path";
import { Effect } from "effect";
import { build, watch } from "rolldown";

type BundleWatcher = ReturnType<typeof watch>;

const configs = (root: string) => [
	{
		// why: the agent SDK locates its platform binary relative to its own
		// module path — inlining it into the bundle breaks that resolution, so
		// it must stay a runtime import.
		external: ["electron", "@anthropic-ai/claude-agent-sdk"],
		input: join(root, "src", "main.ts"),
		output: {
			codeSplitting: false,
			file: join(root, "out", "main.js"),
			format: "esm" as const,
		},
		platform: "node" as const,
	},
	{
		external: ["electron"],
		input: join(root, "src", "preload.ts"),
		output: { file: join(root, "out", "preload.cjs"), format: "cjs" as const },
		platform: "node" as const,
	},
];

export const bundleMainAndPreload = (root: string) =>
	Effect.promise(() =>
		Promise.all(configs(root).map((config) => build(config))),
	);

export const watchMainAndPreload = (root: string, onRebuild: () => void) =>
	Effect.callback<BundleWatcher>((resume) => {
		const watcher = watch(configs(root));
		let ready = false;
		watcher.on("event", (event) => {
			if (event.code === "END") {
				if (ready) {
					onRebuild();
				} else {
					ready = true;
					resume(Effect.succeed(watcher));
				}
			}
			if (event.code === "ERROR") {
				process.stderr.write(`${String(event.error)}\n`);
			}
		});
	});

export const closeWatcher = (watcher: BundleWatcher) =>
	Effect.promise(() => watcher.close());
