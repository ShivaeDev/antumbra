import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";

// why: only the JSON artifacts are needed to replay migrations at runtime;
// the authored migration.ts files stay authoring-time only.
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
