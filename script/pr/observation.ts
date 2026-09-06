import { Result, Schema } from "effect";

const CheckRun = Schema.Struct({ __typename: Schema.Literal("CheckRun"), conclusion: Schema.String, name: Schema.String, status: Schema.String });
const StatusContext = Schema.Struct({ __typename: Schema.Literal("StatusContext"), context: Schema.String, state: Schema.String });
const Check = Schema.Union([CheckRun, StatusContext]);

const View = Schema.Struct({
	headRefOid: Schema.String,
	mergeable: Schema.Literals(["CONFLICTING", "MERGEABLE", "UNKNOWN"]),
	reviewDecision: Schema.String,
	state: Schema.Literals(["CLOSED", "MERGED", "OPEN"]),
	statusCheckRollup: Schema.Array(Check),
});

type Check = typeof Check.Type;

const failedConclusions = new Set(["ACTION_REQUIRED", "CANCELLED", "FAILURE", "STALE", "STARTUP_FAILURE", "TIMED_OUT"]);
const lifecycles = { CLOSED: "closed", MERGED: "merged", OPEN: "open" } as const;

const named = (check: Check): string => (check.__typename === "CheckRun" ? check.name : check.context);
const running = (check: Check): boolean => (check.__typename === "CheckRun" ? check.status !== "COMPLETED" : check.state === "PENDING");
const broke = (check: Check): boolean =>
	check.__typename === "CheckRun" ? failedConclusions.has(check.conclusion) : check.state === "ERROR" || check.state === "FAILURE";

export type Lifecycle = (typeof lifecycles)[keyof typeof lifecycles];
export type Ci = "failed" | "green" | "none" | "pending";

export type Observation = {
	readonly changesRequested: boolean;
	readonly ci: Ci;
	readonly conflict: boolean | undefined;
	readonly failed: readonly string[];
	readonly head: string;
	readonly lifecycle: Lifecycle;
};

const rate = (checks: readonly Check[]): Ci => {
	if (checks.length === 0) return "none";
	if (checks.some(running)) return "pending";
	if (checks.some(broke)) return "failed";
	return "green";
};

const conflicting = (mergeable: typeof View.Type.mergeable): boolean | undefined =>
	mergeable === "UNKNOWN" ? undefined : mergeable === "CONFLICTING";

const observe = (view: typeof View.Type): Observation => ({
	changesRequested: view.reviewDecision === "CHANGES_REQUESTED",
	ci: rate(view.statusCheckRollup),
	conflict: conflicting(view.mergeable),
	failed: view.statusCheckRollup.filter(broke).map(named),
	head: view.headRefOid,
	lifecycle: lifecycles[view.state],
});

const decodeView = Schema.decodeUnknownResult(Schema.fromJsonString(View));

export const observationFrom = (stdout: string): Result.Result<Observation, string> =>
	Result.mapBoth(decodeView(stdout), { onFailure: (error) => error.message, onSuccess: observe });
