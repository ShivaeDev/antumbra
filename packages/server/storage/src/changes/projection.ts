import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { projectChangeAdopted } from "#changes/projections/change-adopted.ts";
import { projectChangeAdoptionFailed } from "#changes/projections/change-adoption-failed.ts";
import { projectChangeAdoptionRequested } from "#changes/projections/change-adoption-requested.ts";
import { projectChangeAdoptionRetried } from "#changes/projections/change-adoption-retried.ts";
import { projectChangeArchived } from "#changes/projections/change-archived.ts";
import { projectChangeDismissed } from "#changes/projections/change-dismissed.ts";
import { projectChangeFeedbackForwarded } from "#changes/projections/change-feedback-forwarded.ts";
import { projectChangeHostCapabilityObserved } from "#changes/projections/change-host-capability-observed.ts";
import { projectChangeObserved } from "#changes/projections/change-observed.ts";
import { projectChangePrepared } from "#changes/projections/change-prepared.ts";
import { projectChangeProposalFrozen } from "#changes/projections/change-proposal-frozen.ts";
import { projectChangePublicationFailed } from "#changes/projections/change-publication-failed.ts";
import { projectChangeRefreshRequested } from "#changes/projections/change-refresh-requested.ts";
import { refresh } from "#changes/refresh.ts";
import type { rows } from "#changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("ChangesHistory.apply")(function* ({ value }: Event<typeof ChangesEvent.Type>) {
		switch (value._tag) {
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
				yield* projectChangePrepared(value);
				break;
			case "ChangeObserved":
				yield* projectChangeObserved(value);
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
				yield* projectChangeProposalFrozen(value);
				break;
		}
		yield* refresh();
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "pieceChangeView"`;
	yield* sql`delete from "changeHostCapability"`;
	yield* sql`delete from "sessionSituation"`;
	yield* sql`delete from "changeRefresh"`;
	yield* sql`delete from "changeAdoptionRequest"`;
	yield* sql`delete from "quayChange"`;
	yield* sql`delete from "change"`;
	yield* sql`delete from "pieceChange"`;
	yield* sql`delete from "changeTransition"`;
	yield* sql`delete from "changeVerdict"`;
	yield* sql`delete from "changeFeedback"`;
	yield* sql`delete from "heldResource"`;
	yield* sql`delete from "pieceOutcome" where "sourceKind" = 'change'`;
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
