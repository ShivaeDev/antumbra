import { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { reset } from "#postgres/changes/projection.ts";
import {
	agent,
	berth,
	change,
	changeAdoptionRequest,
	changeFeedback,
	changeHostCapability,
	changeRefresh,
	changeTransition,
	changeVerdict,
	heldResource,
	moorage,
	pieceAgent,
	pieceChange,
	pieceChangeView,
	quayChange,
	resourceOwner,
	session,
	sessionSituation,
	voyageActivity,
	voyageCaptainWork,
} from "#postgres/changes/rows.ts";
import { ChangesHistory } from "#postgres/changes/service.ts";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
export const journalChanges = Effect.fn("ChangesFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(ChangesEvent, [
		"ChangeAdoptionFailed",
		"ChangeAdoptionRetried",
		"ChangeHostCapabilityObserved",
		"ChangePublicationFailed",
		"ChangeRefreshRequested",
		"ChangeAdoptionRequested",
		"ChangePrepared",
		"ChangeObserved",
		"ChangeAdopted",
		"ChangeArchived",
		"ChangeDismissed",
		"ChangeFeedbackForwarded",
		"ChangeProposalFrozen",
	]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return {
		events,
		resourceOwner: yield* legacyRows(resourceOwner).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		voyageCaptainWork: yield* legacyRows(voyageCaptainWork).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		pieceChangeView: yield* legacyRows(pieceChangeView).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		changeHostCapability: yield* legacyRows(changeHostCapability).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		sessionSituation: yield* legacyRows(sessionSituation).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		changeRefresh: yield* legacyRows(changeRefresh).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		changeAdoptionRequest: yield* legacyRows(changeAdoptionRequest).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		session: yield* legacyRows(session).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		quayChange: yield* legacyRows(quayChange).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		change: yield* legacyRows(change).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		pieceChange: yield* legacyRows(pieceChange).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		changeTransition: yield* legacyRows(changeTransition).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		changeVerdict: yield* legacyRows(changeVerdict).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		changeFeedback: yield* legacyRows(changeFeedback).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		berth: yield* legacyRows(berth).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		moorage: yield* legacyRows(moorage).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		agent: yield* legacyRows(agent).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		heldResource: yield* legacyRows(heldResource).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		voyageActivity: yield* legacyRows(voyageActivity).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		pieceAgent: yield* legacyRows(pieceAgent).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayChangesFixture = Effect.fn("ChangesFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalChanges>>) {
	const history = yield* ChangesHistory;
	yield* reset;
	yield* history.append(Request.make("fixture:change-context"), [
		{
			_tag: "ChangeEvidenceObserved",
			owners: snapshot.resourceOwner,
			agents: snapshot.agent,
			berths: snapshot.berth,
			moorages: snapshot.moorage,
			sessions: snapshot.session,
			assignments: snapshot.pieceAgent,
			activities: snapshot.voyageActivity,
			captains: snapshot.voyageCaptainWork,
			at: 0,
		},
	]);
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(pieceChangeView.Row))(
				snapshot.pieceChangeView.toSorted((a, b) => a.rowId.localeCompare(b.rowId)),
				(yield* rows.pieceChangeView.where({})).toSorted((a, b) => a.rowId.localeCompare(b.rowId)),
			) &&
			Schema.toEquivalence(Schema.Array(changeHostCapability.Row))(snapshot.changeHostCapability, yield* rows.changeHostCapability.where({})) &&
			Schema.toEquivalence(Schema.Array(sessionSituation.Row))(snapshot.sessionSituation, yield* rows.sessionSituation.where({})) &&
			Schema.toEquivalence(Schema.Array(changeRefresh.Row))(snapshot.changeRefresh, yield* rows.changeRefresh.where({})) &&
			Schema.toEquivalence(Schema.Array(changeAdoptionRequest.Row))(snapshot.changeAdoptionRequest, yield* rows.changeAdoptionRequest.where({})) &&
			Schema.toEquivalence(Schema.Array(session.Row))(snapshot.session, yield* rows.session.where({})) &&
			Schema.toEquivalence(Schema.Array(quayChange.Row))(snapshot.quayChange, yield* rows.quayChange.where({})) &&
			Schema.toEquivalence(Schema.Array(change.Row))(snapshot.change, yield* rows.change.where({})) &&
			Schema.toEquivalence(Schema.Array(pieceChange.Row))(snapshot.pieceChange, yield* rows.pieceChange.where({})) &&
			Schema.toEquivalence(Schema.Array(changeTransition.Row))(snapshot.changeTransition, yield* rows.changeTransition.where({})) &&
			Schema.toEquivalence(Schema.Array(changeVerdict.Row))(snapshot.changeVerdict, yield* rows.changeVerdict.where({})) &&
			Schema.toEquivalence(Schema.Array(changeFeedback.Row))(snapshot.changeFeedback, yield* rows.changeFeedback.where({})) &&
			Schema.toEquivalence(Schema.Array(berth.Row))(snapshot.berth, yield* rows.berth.where({})) &&
			Schema.toEquivalence(Schema.Array(moorage.Row))(snapshot.moorage, yield* rows.moorage.where({})) &&
			Schema.toEquivalence(Schema.Array(agent.Row))(snapshot.agent, yield* rows.agent.where({})) &&
			Schema.toEquivalence(Schema.Array(heldResource.Row))(snapshot.heldResource, yield* rows.heldResource.where({})) &&
			Schema.toEquivalence(Schema.Array(voyageActivity.Row))(
				snapshot.voyageActivity.toSorted((a, b) => a.id.localeCompare(b.id)),
				(yield* rows.voyageActivity.where({})).toSorted((a, b) => a.id.localeCompare(b.id)),
			) &&
			Schema.toEquivalence(Schema.Array(pieceAgent.Row))(snapshot.pieceAgent, yield* rows.pieceAgent.where({}))
		)
	)
		return yield* Effect.fail(new ChangesFixtureMismatch({ message: "Changes history does not reproduce captured rows" }));
	return { changes: snapshot.events.length, events: snapshot.events.length };
});
export class ChangesFixtureMismatch extends Schema.TaggedError<ChangesFixtureMismatch>()("ChangesFixtureMismatch", { message: Schema.String }) {}
