import { Schema } from "effect";
import { ChangeChecks, ChangeFeedbackKind, ChangeMergeable, ChangeReview, ChangeSituation, ChangeStage, PieceChangePurpose } from "#change.ts";
import { ChangeId } from "#changes-ids.ts";
import { PieceId } from "#piece.ts";
import { RepoId } from "#repos-ids.ts";
import { SessionId } from "#session-ids.ts";
export const Change = Schema.Struct({
	id: ChangeId,
	repoId: RepoId,
	host: Schema.String,
	title: Schema.String,
	body: Schema.String,
	headRef: Schema.String,
	baseRef: Schema.String,
	headSha: Schema.NullOr(Schema.String),
	preparedHeadRef: Schema.NullOr(Schema.String),
	preparedHeadSha: Schema.NullOr(Schema.String),
	publicationRequestId: Schema.NullOr(Schema.String),
	publicationError: Schema.NullOr(Schema.String),
	proposalFrozenAt: Schema.NullOr(Schema.String),
	worktreePath: Schema.NullOr(Schema.String),
	workingDiff: Schema.NullOr(Schema.String),
	workingTreeStatus: Schema.NullOr(Schema.String),
	submissionKey: Schema.NullOr(Schema.String),
	stage: ChangeStage,
	draftAt: Schema.NullOr(Schema.String),
	url: Schema.NullOr(Schema.String),
	externalId: Schema.NullOr(Schema.String),
	checks: ChangeChecks,
	review: ChangeReview,
	mergeable: ChangeMergeable,
	openedByAgentId: Schema.NullOr(Schema.String),
	originSessionId: Schema.NullOr(Schema.String),
	raw: Schema.NullOr(Schema.String),
	activityAt: Schema.String,
	observedAt: Schema.String,
	landedAt: Schema.NullOr(Schema.String),
	withdrawnAt: Schema.NullOr(Schema.String),
	archivedAt: Schema.NullOr(Schema.String),
	createdAt: Schema.String,
});
export const HostCapability = Schema.Struct({ host: Schema.String, available: Schema.Boolean, detail: Schema.String });
export const SessionSituation = Schema.Struct({
	id: Schema.String,
	sessionId: SessionId,
	changeId: ChangeId,
	reference: Schema.String,
	situation: ChangeSituation,
	label: Schema.String,
	text: Schema.String,
	feedbackIds: Schema.Array(Schema.String),
});
export const ChangeRefresh = Schema.Struct({ id: Schema.Literal("changes"), request: Schema.String });
export const AdoptionRequest = Schema.Struct({
	id: Schema.String,
	pieceId: PieceId,
	repoId: RepoId,
	error: Schema.NullOr(Schema.String),
	url: Schema.String,
});
export const PieceChange = Schema.Struct({ id: Schema.String, pieceId: PieceId, changeId: ChangeId, purpose: PieceChangePurpose });
export const ChangeTransition = Schema.Struct({
	id: Schema.String,
	changeId: ChangeId,
	fromStage: ChangeStage,
	toStage: ChangeStage,
	activityAt: Schema.String,
	observedAt: Schema.String,
});
export const ChangeVerdict = Schema.Struct({ changeId: ChangeId, verdict: Schema.Literal("dismissed"), landedAt: Schema.String });
export const ChangeFeedback = Schema.Struct({
	id: Schema.String,
	changeId: ChangeId,
	kind: ChangeFeedbackKind,
	author: Schema.String,
	verdict: Schema.NullOr(ChangeReview),
	path: Schema.NullOr(Schema.String),
	line: Schema.NullOr(Schema.Number),
	body: Schema.String,
	url: Schema.String,
	at: Schema.String,
	forwardedAt: Schema.NullOr(Schema.String),
});
export const PieceChangeView = Schema.Struct({ ...Change.fields, rowId: Schema.String, pieceId: PieceId, repoName: Schema.String });
export const QuayPiece = Schema.Struct({ id: Schema.String, title: Schema.String, voyageId: Schema.String, voyageName: Schema.String });
export const QuayChange = Schema.Struct({
	...Change.fields,
	repoName: Schema.String,
	group: Schema.Literals(["alongside", "archived", "checksRunning", "draft", "landed", "needsAttention"]),
	pieces: Schema.Array(QuayPiece),
});
