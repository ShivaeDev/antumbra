import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";

const SKILL_PLUGIN_ENTRIES = [".claude-plugin", "skills"];

export const copySkillAssets = (desktopRoot: string, workspaceRoot: string) =>
	Effect.sync(() => {
		const source = join(workspaceRoot, "packages", "skills");
		const target = join(desktopRoot, "out", "skills");
		rmSync(target, { force: true, recursive: true });
		mkdirSync(target, { recursive: true });
		for (const entry of SKILL_PLUGIN_ENTRIES) {
			cpSync(join(source, entry), join(target, entry), { recursive: true });
		}
	});

export const copyOpencodePluginAssets = (desktopRoot: string, workspaceRoot: string) =>
	Effect.sync(() => {
		const source = join(workspaceRoot, "packages", "backend-opencode", "plugin");
		const target = join(desktopRoot, "out", "opencode");
		rmSync(target, { force: true, recursive: true });
		mkdirSync(target, { recursive: true });
		cpSync(source, target, { filter: (path) => !path.endsWith(".d.ts"), recursive: true });
	});

// Runtime migration replay consumes the generated JSON artifacts; migration.ts remains authoring-time source.
export const copyPersistenceAssets = (desktopRoot: string, workspaceRoot: string) =>
	Effect.sync(() => {
		const source = join(workspaceRoot, "packages", "persistence", "migrations");
		const target = join(desktopRoot, "out", "persistence", "migrations");
		rmSync(target, { force: true, recursive: true });
		mkdirSync(target, { recursive: true });
		cpSync(source, target, {
			filter: (path) => !path.endsWith(".ts"),
			recursive: true,
		});
	});
