import {
	change,
	changeAdoptionRequest,
	changeFeedback,
	changeHostCapability,
	changeRefresh,
	changeTransition,
	changeVerdict,
	heldResource,
	pieceAgent,
	pieceChange,
	pieceChangeView,
	quayChange,
	sessionSituation,
} from "@antumbra/server-storage/changes/rows.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as changeAdoptionRequestSelection } from "@antumbra/server-storage/records/change-adoption-request.ts";
import { selection as changeFeedbackSelection } from "@antumbra/server-storage/records/change-feedback.ts";
import { selection as changeHostCapabilitySelection } from "@antumbra/server-storage/records/change-host-capability.ts";
import { selection as changeRefreshSelection } from "@antumbra/server-storage/records/change-refresh.ts";
import { selection as changeTransitionSelection } from "@antumbra/server-storage/records/change-transition.ts";
import { selection as changeVerdictSelection } from "@antumbra/server-storage/records/change-verdict.ts";
import { selection as heldResourceSelection } from "@antumbra/server-storage/records/held-resource.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as pieceChangeSelection } from "@antumbra/server-storage/records/piece-change.ts";
import { selection as pieceChangeViewSelection } from "@antumbra/server-storage/records/piece-change-view.ts";
import { selection as quayChangeSelection } from "@antumbra/server-storage/records/quay-change.ts";
import { selection as sessionSituationSelection } from "@antumbra/server-storage/records/session-situation.ts";
import { Effect, Schema } from "effect";
import type { journalChanges } from "#replay/changes-read.ts";
export const replayChangesFixture = Effect.fn("ChangesFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalChanges>>) {
	const history = yield* ChangesHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	return { changes: snapshot.events.length, events: snapshot.events.length };
});
export const checkChanges = Effect.fn("ChangesFixture.check")(function* (snapshot: Effect.Success<ReturnType<typeof journalChanges>>) {
	const history = yield* ChangesHistory;
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(pieceChangeView.Row))(
				snapshot.pieceChangeView.toSorted((a, b) => a.rowId.localeCompare(b.rowId)),
				(yield* rows.pieceChangeView
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeViewSelection })
					.pipe(Effect.orDie)).toSorted((a, b) => a.rowId.localeCompare(b.rowId)),
			) &&
			Schema.toEquivalence(Schema.Array(changeHostCapability.Row))(
				snapshot.changeHostCapability,
				yield* rows.changeHostCapability
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeHostCapabilitySelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(sessionSituation.Row))(
				snapshot.sessionSituation,
				yield* rows.sessionSituation
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSituationSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(changeRefresh.Row))(
				snapshot.changeRefresh,
				yield* rows.changeRefresh
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeRefreshSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(changeAdoptionRequest.Row))(
				snapshot.changeAdoptionRequest,
				yield* rows.changeAdoptionRequest
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeAdoptionRequestSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(quayChange.Row))(
				snapshot.quayChange,
				yield* rows.quayChange
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: quayChangeSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(change.Row))(
				snapshot.change,
				yield* rows.change.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection }).pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(pieceChange.Row))(
				snapshot.pieceChange,
				yield* rows.pieceChange
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceChangeSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(changeTransition.Row))(
				snapshot.changeTransition,
				yield* rows.changeTransition
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeTransitionSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(changeVerdict.Row))(
				snapshot.changeVerdict,
				yield* rows.changeVerdict
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeVerdictSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(changeFeedback.Row))(
				snapshot.changeFeedback,
				yield* rows.changeFeedback
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeFeedbackSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(heldResource.Row))(
				snapshot.heldResource,
				yield* rows.heldResource
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: heldResourceSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(pieceAgent.Row))(
				snapshot.pieceAgent,
				yield* rows.pieceAgent
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
					.pipe(Effect.orDie),
			)
		)
	)
		return yield* Effect.fail(new ChangesFixtureMismatch({ message: "Changes history does not reproduce captured rows" }));
	return { changes: snapshot.events.length, events: snapshot.events.length };
});
export class ChangesFixtureMismatch extends Schema.TaggedError<ChangesFixtureMismatch>()("ChangesFixtureMismatch", { message: Schema.String }) {}
