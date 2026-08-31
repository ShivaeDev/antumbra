import type { AntumbraPlugin } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { GH_EXECUTABLE, type GitHubHostOptions, makeGitHubHost } from "#host.ts";

// Capability stays lazy so a new gh installation or login needs no restart.
export const githubPlugin = (options: GitHubHostOptions = { executable: GH_EXECUTABLE }): AntumbraPlugin => ({
	activate: (context) => makeGitHubHost(options).pipe(Effect.flatMap((host) => context.registerChangeHost(host))),
	name: "github",
});
