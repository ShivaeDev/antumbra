import { isAbsolute, join } from "node:path";
import { Result } from "effect";

export const overrideVariable = "ANTUMBRA_DEV_USER_DATA";

const developmentDirectory = "Antumbra-Dev";

export const devDataDirectory = (appData: string, override: string): Result.Result<string, string> => {
	if (override === "") return Result.succeed(join(appData, developmentDirectory));
	if (isAbsolute(override)) return Result.succeed(override);
	return Result.fail(`${overrideVariable} must be an absolute path`);
};

export const journalPath = (dataDirectory: string): string => join(dataDirectory, "server", "journal.db");

export const journalFiles = (journal: string): readonly string[] => [journal, `${journal}-wal`, `${journal}-shm`];

export const desktopLockPath = (dataDirectory: string): string => join(dataDirectory, "SingletonLock");
