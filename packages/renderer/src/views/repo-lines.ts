import type { RepoSpec } from "@antumbra/contract";

// why: one repo per line, "source" or "source ref" — ref defaults to main so
// the common case types nothing extra.
export const parseRepoLines = (text: string): ReadonlyArray<RepoSpec> =>
	text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "")
		.map((line) => {
			const [source, ref] = line.split(/\s+/);
			return { ref: ref ?? "main", source: source ?? "" };
		})
		.filter((repo) => repo.source !== "");
