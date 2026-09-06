import { Result, Schema } from "effect";
import { decoder } from "#pr/decode.ts";

export type Ci = "failed" | "green" | "none" | "pending";
export type Lifecycle = "closed" | "merged" | "open";

export type Pull = { readonly conflict: boolean | undefined; readonly head: string; readonly lifecycle: Lifecycle };
export type Checks = { readonly ci: Ci; readonly failed: readonly string[] };

const PullBody = Schema.Struct({
	head: Schema.Struct({ sha: Schema.String }),
	mergeable_state: Schema.String,
	merged: Schema.Boolean,
	state: Schema.String,
});

const ChecksBody = Schema.Struct({
	check_runs: Schema.Array(Schema.Struct({ conclusion: Schema.NullOr(Schema.String), name: Schema.String, status: Schema.String })),
});

const failedConclusions = new Set(["action_required", "cancelled", "failure", "stale", "startup_failure", "timed_out"]);

const rate = (runs: ReadonlyArray<{ readonly conclusion: string | null; readonly status: string }>): Ci => {
	if (runs.length === 0) return "none";
	if (runs.some((run) => run.status !== "completed")) return "pending";
	if (runs.some((run) => run.conclusion !== null && failedConclusions.has(run.conclusion))) return "failed";
	return "green";
};

const lifecycleOf = (merged: boolean, state: string): Lifecycle => {
	if (merged) return "merged";
	return state === "closed" ? "closed" : "open";
};

const decodePull = decoder(Schema.fromJsonString(PullBody));
const decodeChecks = decoder(Schema.fromJsonString(ChecksBody));

export const pullFrom = (body: string): Result.Result<Pull, string> =>
	Result.map(decodePull(body), (pull) => ({
		conflict: pull.mergeable_state === "unknown" ? undefined : pull.mergeable_state === "dirty",
		head: pull.head.sha,
		lifecycle: lifecycleOf(pull.merged, pull.state),
	}));

export const checksFrom = (body: string): Result.Result<Checks, string> =>
	Result.map(decodeChecks(body), (checks) => ({
		ci: rate(checks.check_runs),
		failed: checks.check_runs.filter((run) => run.conclusion !== null && failedConclusions.has(run.conclusion)).map((run) => run.name),
	}));
