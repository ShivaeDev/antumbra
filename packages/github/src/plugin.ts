import type { AntumbraPlugin } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { GH_EXECUTABLE, type GitHubHostOptions, makeGitHubHost } from "#host.ts";

// why: nothing is verified at activation. Whether gh is installed and logged
// in is asked at the moment it matters and answered as a capability, so a
// machine that gains a login mid-session gains the host without a restart —
// and one that never had it still shows the repos and says why.
export const githubPlugin = (options: GitHubHostOptions = { executable: GH_EXECUTABLE }): AntumbraPlugin => ({
	activate: (context) => makeGitHubHost(options).pipe(Effect.flatMap((host) => context.registerChangeHost(host))),
	name: "github",
});
