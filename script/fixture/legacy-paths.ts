import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { Result } from "effect";
export const overrideVariable = "ANTUMBRA_DEV_USER_DATA";
export const appDataDirectory = (): string => join(homedir(), "Library", "Application Support");
export const devDataDirectory = (appData: string, override: string): Result.Result<string, string> => {
	if (override === "") return Result.succeed(join(appData, "Antumbra-Dev"));
	if (isAbsolute(override)) return Result.succeed(override);
	return Result.fail(`${overrideVariable} must be an absolute path`);
};
