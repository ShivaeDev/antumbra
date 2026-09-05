import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";

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
