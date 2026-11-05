import { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
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
} from "@antumbra/server-storage/changes/rows.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalChanges = Effect.fn("ChangesFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
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
