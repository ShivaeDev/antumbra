import { Result, Schema } from "effect";
import { decoder, firstPage, pagesDecoder } from "#pr/decode.ts";

export const Ci = Schema.Literals(["failed", "green", "none", "pending"]);
export type Ci = typeof Ci.Type;

export const Checks = Schema.Struct({ ci: Ci, failed: Schema.Array(Schema.String), head: Schema.String });
export type Checks = typeof Checks.Type;

const RunsBody = Schema.Struct({
	check_runs: Schema.Array(Schema.Struct({ conclusion: Schema.NullOr(Schema.String), name: Schema.String, status: Schema.String })),
});

const StatusBody = Schema.Struct({
	state: Schema.String,
	statuses: Schema.Array(Schema.Struct({ context: Schema.String, state: Schema.String })),
	total_count: Schema.Number,
});

const failedConclusions = new Set(["action_required", "cancelled", "failure", "stale", "startup_failure", "timed_out"]);
const failedStates = new Set(["error", "failure"]);

const rate = (runs: ReadonlyArray<{ readonly conclusion: string | null; readonly status: string }>): Ci => {
	if (runs.length === 0) return "none";
	if (runs.some((run) => run.status !== "completed")) return "pending";
	if (runs.some((run) => run.conclusion !== null && failedConclusions.has(run.conclusion))) return "failed";
	return "green";
};

const combinedStates: Readonly<Record<string, Ci>> = { failure: "failed", pending: "pending", success: "green" };

const decodeRunsPage = decoder(Schema.fromJsonString(RunsBody));
const decodeRuns = pagesDecoder((body: string) => Result.map(decodeRunsPage(body), (page) => page.check_runs));
const decodeStatus = firstPage(decoder(Schema.fromJsonString(StatusBody)));

export const checksFrom = (pages: readonly string[], head: string): Result.Result<Checks, string> =>
	Result.map(decodeRuns(pages), (runs) => ({
		ci: rate(runs),
		failed: runs.filter((run) => run.conclusion !== null && failedConclusions.has(run.conclusion)).map((run) => run.name),
		head,
	}));

export const statusesFrom = (pages: readonly string[], head: string): Result.Result<Checks, string> =>
	Result.map(decodeStatus(pages), (status) => ({
		ci: status.total_count === 0 ? "none" : (combinedStates[status.state] ?? "pending"),
		failed: status.statuses.filter((entry) => failedStates.has(entry.state)).map((entry) => entry.context),
		head,
	}));

const precedence: readonly Ci[] = ["pending", "failed", "green"];

export const combined = (left: Ci, right: Ci): Ci => precedence.find((ci) => left === ci || right === ci) ?? "none";
