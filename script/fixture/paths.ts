import { homedir } from "node:os";
import { join } from "node:path";
import { Effect, Result } from "effect";
import { FixtureError } from "#fixture/manifest.ts";
import { devDataDirectory } from "#journal/paths.ts";

export const fixturePaths = (checkout: string, home = homedir()) => ({
	archiveRoot: join(home, ".antumbra", "fixtures"),
	open: join(checkout, ".fixtures", "open"),
	check: join(checkout, ".fixtures", "check"),
});

export const sourceDirectory = (source: "dev" | "prod", appData: string, override = "") => {
	const directory = source === "prod" ? Result.succeed(join(appData, "Antumbra")) : devDataDirectory(appData, override);
	return Result.isSuccess(directory) ? Effect.succeed(directory.success) : Effect.fail(new FixtureError({ message: directory.failure }));
};
