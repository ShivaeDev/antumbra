import { Schema } from "effect";
import { Agent, Berth, Moorage, PieceAgent, ResourceOwner, VoyageActivity, VoyageCaptainWork } from "#change-evidence.ts";
import { AdoptionRequest, Change, ChangeFeedback, ChangeTransition, HostCapability, PieceChange } from "#changes.ts";
import { ChangeId } from "#changes-ids.ts";
import { Session } from "#session.ts";
export const ChangeAdoptionFailedPayload = Schema.Struct({ id: Schema.NullOr(Schema.String), message: Schema.String });
export const ChangeAdoptionRetriedPayload = Schema.Struct({ id: Schema.String, url: Schema.String });
export const ChangeHostCapabilityObservedPayload = Schema.Struct(HostCapability.fields);
export const ChangePublicationFailedPayload = Schema.Struct({ change: Schema.NullOr(Change) });
export const ChangeRefreshRequestedPayload = Schema.Struct({ request: Schema.String });
export const ChangeAdoptionRequestedPayload = Schema.Struct(AdoptionRequest.fields);
export const ChangePreparedPayload = Schema.Struct({ change: Change, link: PieceChange });
export const ChangeObservedPayload = Schema.Struct({
	change: Schema.NullOr(Change),
	transition: Schema.NullOr(ChangeTransition),
	feedback: Schema.Array(ChangeFeedback),
});
export const ChangeAdoptedPayload = Schema.Struct({
	adoptionId: Schema.NullOr(Schema.String),
	change: Change,
	transition: Schema.NullOr(ChangeTransition),
	link: PieceChange,
});
export const ChangeArchivedPayload = Schema.Struct({ changeId: ChangeId });
export const ChangeDismissedPayload = Schema.Struct({ changeId: ChangeId });
export const ChangeFeedbackForwardedPayload = Schema.Struct({
	changeId: ChangeId,
	ids: Schema.Array(Schema.String),
});
export const ChangeProposalFrozenPayload = Schema.Struct({ change: Change });
export const ChangeEvidence = Schema.Struct({
	owners: Schema.Array(ResourceOwner),
	agents: Schema.Array(Agent),
	berths: Schema.Array(Berth),
	moorages: Schema.Array(Moorage),
	sessions: Schema.Array(Session),
	assignments: Schema.Array(PieceAgent),
	activities: Schema.Array(VoyageActivity),
	captains: Schema.Array(VoyageCaptainWork),
});
export const ChangesEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("ChangeEvidenceObserved"), ...ChangeEvidence.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeAdoptionFailed"), ...ChangeAdoptionFailedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeAdoptionRetried"), ...ChangeAdoptionRetriedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeHostCapabilityObserved"), ...ChangeHostCapabilityObservedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangePublicationFailed"), ...ChangePublicationFailedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeRefreshRequested"), ...ChangeRefreshRequestedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeAdoptionRequested"), ...ChangeAdoptionRequestedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangePrepared"), ...ChangePreparedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeObserved"), ...ChangeObservedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeAdopted"), ...ChangeAdoptedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeArchived"), ...ChangeArchivedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeDismissed"), ...ChangeDismissedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeFeedbackForwarded"), ...ChangeFeedbackForwardedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ChangeProposalFrozen"), ...ChangeProposalFrozenPayload.fields, at: Schema.Number }),
]);
