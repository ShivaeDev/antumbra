import { join } from "node:path";

export const runnerRootsInDataDirectory = (dataDirectory: string): { readonly moorageRoot: string; readonly reposRoot: string } => ({
	moorageRoot: join(dataDirectory, "moorage"),
	reposRoot: join(dataDirectory, "repos"),
});

export const artifactsInDataDirectory = (dataDirectory: string): string => join(dataDirectory, "artifacts");

export const sessionInputsInDataDirectory = (dataDirectory: string): string => join(dataDirectory, "session-inputs");

export const windowLayoutInDataDirectory = (dataDirectory: string): string => join(dataDirectory, "windows.json");
