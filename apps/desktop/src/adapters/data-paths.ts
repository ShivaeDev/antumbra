import { join } from "node:path";

export const runnerRootsInDataDirectory = (
	dataDirectory: string,
): { readonly moorageRoot: string; readonly reposRoot: string } => ({
	moorageRoot: join(dataDirectory, "moorage"),
	reposRoot: join(dataDirectory, "repos"),
});

export const artifactsInDataDirectory = (dataDirectory: string): string =>
	join(dataDirectory, "artifacts");

export const sessionInputsInDataDirectory = (dataDirectory: string): string =>
	join(dataDirectory, "session-inputs");

// why: where the windows were is shell state, not domain truth — it sits in
// the data directory beside the artifacts rather than in the persistence
// database, whose migrations carry contract hashes that layout must never
// have a say in.
export const windowLayoutInDataDirectory = (dataDirectory: string): string =>
	join(dataDirectory, "windows.json");
