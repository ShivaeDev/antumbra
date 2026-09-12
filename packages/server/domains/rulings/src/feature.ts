import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { voyageProgress } from "@antumbra/domain-voyages/rows/voyage-progress.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { acknowledgeNotice } from "#commands/acknowledge-notice.ts";
import { addContext } from "#commands/add-context.ts";
import { answer } from "#commands/answer.ts";
import { gate } from "#commands/gate.ts";
import { markDelivered } from "#commands/mark-delivered.ts";
import { park } from "#commands/park.ts";
import { passUp } from "#commands/pass-up.ts";
import { proclaim } from "#commands/proclaim.ts";
import { reclassify } from "#commands/reclassify.ts";
import { request, subjectRows } from "#commands/request.ts";
import { supersede } from "#commands/supersede.ts";
import { withdraw } from "#commands/withdraw.ts";
import { rulingAnswered } from "#facts/ruling-answered.ts";
import { rulingContextAdded } from "#facts/ruling-context-added.ts";
import { rulingDelivered } from "#facts/ruling-delivered.ts";
import { rulingGated } from "#facts/ruling-gated.ts";
import { rulingNoticeDelivered } from "#facts/ruling-notice-delivered.ts";
import { rulingParked } from "#facts/ruling-parked.ts";
import { rulingPassedUp } from "#facts/ruling-passed-up.ts";
import { rulingProclaimed } from "#facts/ruling-proclaimed.ts";
import { rulingReclassified } from "#facts/ruling-reclassified.ts";
import { rulingRequested } from "#facts/ruling-requested.ts";
import { rulingSuperseded } from "#facts/ruling-superseded.ts";
import { rulingWithdrawn } from "#facts/ruling-withdrawn.ts";
import { requestWrites } from "#materializers/requested.ts";
import { rulingAnsweredMaterializer } from "#materializers/ruling-answered.ts";
import { rulingContextAddedMaterializer } from "#materializers/ruling-context-added.ts";
import { rulingDeliveredMaterializer } from "#materializers/ruling-delivered.ts";
import { rulingGatedMaterializer } from "#materializers/ruling-gated.ts";
import { rulingNoticeDeliveredMaterializer } from "#materializers/ruling-notice-delivered.ts";
import { rulingParkedMaterializer } from "#materializers/ruling-parked.ts";
import { rulingPassedUpMaterializer } from "#materializers/ruling-passed-up.ts";
import { rulingProclaimedMaterializer } from "#materializers/ruling-proclaimed.ts";
import { rulingReclassifiedMaterializer } from "#materializers/ruling-reclassified.ts";
import { rulingRequestedMaterializer } from "#materializers/ruling-requested.ts";
import { rulingSupersededMaterializer } from "#materializers/ruling-superseded.ts";
import { rulingWithdrawnMaterializer } from "#materializers/ruling-withdrawn.ts";
import { authority } from "#queries/authority.ts";
import { awaitingAscent } from "#queries/awaiting-ascent.ts";
import { awaitingDelivery } from "#queries/awaiting-delivery.ts";
import { binding } from "#queries/binding.ts";
import { byId } from "#queries/by-id.ts";
import { choices } from "#queries/choices.ts";
import { display } from "#queries/display.ts";
import { frontier } from "#queries/frontier.ts";
import { open } from "#queries/open.ts";
import { openGates } from "#queries/open-gates.ts";
import { replacements } from "#queries/replacements.ts";
import { standing } from "#queries/standing.ts";
import { rulingDisplay } from "#rows/display.ts";
import { rulingNoticeReceipt } from "#rows/notice-receipt.ts";
export const rulings = feature("rulings", {
	rows: [rulingNoticeReceipt, ...subjectRows, ...requestWrites, rulingDisplay, voyageAgent, pieceProgress, voyageProgress],
	facts: [
		rulingNoticeDelivered,
		rulingAnswered,
		rulingContextAdded,
		rulingDelivered,
		rulingGated,
		rulingParked,
		rulingPassedUp,
		rulingProclaimed,
		rulingReclassified,
		rulingRequested,
		rulingSuperseded,
		rulingWithdrawn,
	],
	commands: [acknowledgeNotice, addContext, answer, gate, markDelivered, park, passUp, proclaim, reclassify, request, supersede, withdraw],
	materializers: [
		rulingNoticeDeliveredMaterializer,
		rulingAnsweredMaterializer,
		rulingContextAddedMaterializer,
		rulingDeliveredMaterializer,
		rulingGatedMaterializer,
		rulingParkedMaterializer,
		rulingPassedUpMaterializer,
		rulingProclaimedMaterializer,
		rulingReclassifiedMaterializer,
		rulingRequestedMaterializer,
		rulingSupersededMaterializer,
		rulingWithdrawnMaterializer,
	],
	queries: [authority, choices, replacements, display, awaitingAscent, awaitingDelivery, binding, byId, frontier, openGates, open, standing],
});
