import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { skillPluginDirectory } from "@antumbra/platform-skills/location.ts";
import { Effect } from "effect";

const SKILL_PLUGIN_ENTRIES = [".claude-plugin", "skills"];

export const copySkillAssets = (desktopRoot: string) =>
	Effect.sync(() => {
		const source = skillPluginDirectory;
		const target = join(desktopRoot, "out", "skills");
		rmSync(target, { force: true, recursive: true });
		mkdirSync(target, { recursive: true });
		for (const entry of SKILL_PLUGIN_ENTRIES) {
			cpSync(join(source, entry), join(target, entry), { recursive: true });
		}
	});

export const copyOpencodePluginAssets = (desktopRoot: string) =>
	Effect.sync(() => {
		const source = dirname(fileURLToPath(import.meta.resolve("@antumbra/runner/backends/opencode/plugin/caller-session.js")));
		const target = join(desktopRoot, "out", "opencode");
		rmSync(target, { force: true, recursive: true });
		mkdirSync(target, { recursive: true });
		cpSync(source, target, { filter: (path) => !path.endsWith(".d.ts"), recursive: true });
	});
