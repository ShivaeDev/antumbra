import type { PrismaError } from "@antumbra/persistence";
import type {
	ChangeChecks,
	ChangeMergeable,
	ChangeReview,
	ChangeStage,
} from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";

// why: the columns hold text and the vocabulary they hold is closed, so a row
// is read back through total tables — no cast, and a word this build does not
// know reads as the cautious answer: a stage nobody recognizes is still
// pending, and an unrecognized signal is no signal.
const STAGES: Readonly<Record<string, ChangeStage>> = {
	landed: "landed",
	open: "open",
	prepared: "prepared",
	withdrawn: "withdrawn",
};

const CHECKS: Readonly<Record<string, ChangeChecks>> = {
	green: "green",
	none: "none",
	pending: "pending",
	red: "red",
};

const REVIEWS: Readonly<Record<string, ChangeReview>> = {
	approved: "approved",
	changes_requested: "changes_requested",
	none: "none",
	pending: "pending",
};

const MERGEABLES: Readonly<Record<string, ChangeMergeable>> = {
	clean: "clean",
	conflict: "conflict",
	unknown: "unknown",
};

type StoredChange = Omit<
	ChangeRow,
	"checks" | "mergeable" | "review" | "stage"
> & {
	readonly checks: string;
	readonly mergeable: string;
	readonly review: string;
	readonly stage: string;
};

export const changeRow = (row: StoredChange): ChangeRow => ({
	activityAt: row.activityAt,
	baseRef: row.baseRef,
	body: row.body,
	checks: CHECKS[row.checks] ?? "none",
	draftAt: row.draftAt,
	externalId: row.externalId,
	headRef: row.headRef,
	headSha: row.headSha,
	host: row.host,
	id: row.id,
	landedAt: row.landedAt,
	mergeable: MERGEABLES[row.mergeable] ?? "unknown",
	observedAt: row.observedAt,
	openedByAgentId: row.openedByAgentId,
	raw: row.raw,
	repoId: row.repoId,
	review: REVIEWS[row.review] ?? "none",
	stage: STAGES[row.stage] ?? "prepared",
	title: row.title,
	url: row.url,
	withdrawnAt: row.withdrawnAt,
});

export const changeOfExternalId = (
	deps: AgentDeps,
	host: string,
	externalId: string,
): Effect.Effect<Option.Option<ChangeRow>, PrismaError> =>
	provideExecutors(deps)(
		deps.db.Change.where({ externalId, host }).first(),
	).pipe(Effect.map((row) => Option.map(row, changeRow)));

// why: only what is still open is worth asking a host about — a prepared
// change has never reached it, and a settled one is history.
export const openChangesOfHost = (
	deps: AgentDeps,
	host: string,
): Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError> =>
	provideExecutors(deps)(
		deps.db.Change.where({ host, stage: "open" }).all(),
	).pipe(Effect.map((rows) => rows.map(changeRow)));
