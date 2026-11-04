import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { projectChangeAdopted } from "#postgres/changes/projections/change-adopted.ts";
import { projectChangeAdoptionFailed } from "#postgres/changes/projections/change-adoption-failed.ts";
import { projectChangeAdoptionRequested } from "#postgres/changes/projections/change-adoption-requested.ts";
import { projectChangeAdoptionRetried } from "#postgres/changes/projections/change-adoption-retried.ts";
import { projectChangeArchived } from "#postgres/changes/projections/change-archived.ts";
import { projectChangeDismissed } from "#postgres/changes/projections/change-dismissed.ts";
import { projectChangeEvidenceObserved } from "#postgres/changes/projections/change-evidence-observed.ts";
import { projectChangeFeedbackForwarded } from "#postgres/changes/projections/change-feedback-forwarded.ts";
import { projectChangeHostCapabilityObserved } from "#postgres/changes/projections/change-host-capability-observed.ts";
import { projectChangeObserved } from "#postgres/changes/projections/change-observed.ts";
import { projectChangePrepared } from "#postgres/changes/projections/change-prepared.ts";
import { projectChangeProposalFrozen } from "#postgres/changes/projections/change-proposal-frozen.ts";
import { projectChangePublicationFailed } from "#postgres/changes/projections/change-publication-failed.ts";
import { projectChangeRefreshRequested } from "#postgres/changes/projections/change-refresh-requested.ts";
import { refresh } from "#postgres/changes/refresh.ts";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("ChangesHistory.apply")(function* ({ value }: Event<typeof ChangesEvent.Type>) {
		switch (value._tag) {
			case "ChangeEvidenceObserved":
				yield* projectChangeEvidenceObserved(rows)(value);
				break;
			case "ChangeAdoptionFailed":
				yield* projectChangeAdoptionFailed(rows)(value);
				break;
			case "ChangeAdoptionRetried":
				yield* projectChangeAdoptionRetried(rows)(value);
				break;
			case "ChangeHostCapabilityObserved":
				yield* projectChangeHostCapabilityObserved(rows)(value);
				break;
			case "ChangePublicationFailed":
				yield* projectChangePublicationFailed(rows)(value);
				break;
			case "ChangeRefreshRequested":
				yield* projectChangeRefreshRequested(rows)(value);
				break;
			case "ChangeAdoptionRequested":
				yield* projectChangeAdoptionRequested(rows)(value);
				break;
			case "ChangePrepared":
				yield* projectChangePrepared(rows)(value);
				break;
			case "ChangeObserved":
				yield* projectChangeObserved(rows)(value);
				break;
			case "ChangeAdopted":
				yield* projectChangeAdopted(rows)(value);
				break;
			case "ChangeArchived":
				yield* projectChangeArchived(rows)(value);
				break;
			case "ChangeDismissed":
				yield* projectChangeDismissed(rows)(value);
				break;
			case "ChangeFeedbackForwarded":
				yield* projectChangeFeedbackForwarded(rows)(value);
				break;
			case "ChangeProposalFrozen":
				yield* projectChangeProposalFrozen(rows)(value);
				break;
		}
		yield* refresh();
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra."pieceChangeView"`;
	yield* sql`delete from antumbra."changeHostCapability"`;
	yield* sql`delete from antumbra."sessionSituation"`;
	yield* sql`delete from antumbra."changeRefresh"`;
	yield* sql`delete from antumbra."changeAdoptionRequest"`;
	yield* sql`delete from antumbra."change_context_session"`;
	yield* sql`delete from antumbra."quayChange"`;
	yield* sql`delete from antumbra."change"`;
	yield* sql`delete from antumbra."pieceChange"`;
	yield* sql`delete from antumbra."changeTransition"`;
	yield* sql`delete from antumbra."changeVerdict"`;
	yield* sql`delete from antumbra."changeFeedback"`;
	yield* sql`delete from antumbra."change_context_berth"`;
	yield* sql`delete from antumbra."change_context_moorage"`;
	yield* sql`delete from antumbra."change_context_agent"`;
	yield* sql`delete from antumbra."heldResource"`;
	yield* sql`delete from antumbra."change_context_voyageActivity"`;
	yield* sql`delete from antumbra."change_context_pieceAgent"`;
	yield* sql`delete from antumbra.piece_outcomes where "sourceKind" = 'change'`;
	yield* sql`delete from antumbra.change_captain_work`;
	yield* sql`delete from antumbra.change_resource_owners`;
	yield* invalidateOnCommit([
		"pieceChangeView",
		"changeHostCapability",
		"sessionSituation",
		"changeRefresh",
		"changeAdoptionRequest",
		"session",
		"quayChange",
		"change",
		"pieceChange",
		"changeTransition",
		"changeVerdict",
		"changeFeedback",
		"berth",
		"moorage",
		"agent",
		"heldResource",
		"voyageActivity",
		"pieceAgent",
	]);
});
