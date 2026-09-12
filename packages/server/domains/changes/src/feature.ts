import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceOutcome } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { heldResource } from "@antumbra/domain-reclamation/rows/held-resource.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { adopt } from "#commands/adopt.ts";
import { claimRows } from "#commands/claims.ts";
import { dismiss } from "#commands/dismiss.ts";
import { freeze } from "#commands/freeze.ts";
import { observe } from "#commands/observe.ts";
import { prepare } from "#commands/prepare.ts";
import { failPublication, publicationFailed, publicationFailedMaterializer } from "#commands/publication-failed.ts";
import { changeRefresh, refresh, refreshRequested, refreshRequestedMaterializer } from "#commands/refresh.ts";
import { adoptionRequested, adoptionRequestedMaterializer, requestAdoption } from "#commands/request-adoption.ts";
import { changeAdopted } from "#facts/change-adopted.ts";
import { changeDismissed } from "#facts/change-dismissed.ts";
import { changeObserved } from "#facts/change-observed.ts";
import { changePrepared } from "#facts/change-prepared.ts";
import { proposalFrozen } from "#facts/proposal-frozen.ts";
import { changeAdoptedMaterializer } from "#materializers/change-adopted.ts";
import { changeDismissedMaterializer } from "#materializers/change-dismissed.ts";
import { changeObservedMaterializer } from "#materializers/change-observed.ts";
import { changePreparedMaterializer } from "#materializers/change-prepared.ts";
import { proposalFrozenMaterializer } from "#materializers/proposal-frozen.ts";
import { adoptions } from "#queries/adoptions.ts";
import { all } from "#queries/all.ts";
import { links } from "#queries/links.ts";
import { publishing } from "#queries/publishing.ts";
import { quay } from "#queries/quay.ts";
import { watchable } from "#queries/watchable.ts";
import { world } from "#queries/world.ts";
import { adoptionRequest } from "#rows/adoption-request.ts";
import { change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
import { changeVerdict } from "#rows/change-verdict.ts";
import { pieceChange } from "#rows/piece-change.ts";
import { quayChange } from "#rows/quay-change.ts";
export const changes = feature("changes", {
	rows: [
		changeRefresh,
		adoptionRequest,
		session,
		voyage,
		quayChange,
		change,
		pieceChange,
		changeTransition,
		changeVerdict,
		piece,
		repo,
		...claimRows,
		pieceOutcome,
		heldResource,
	],
	facts: [publicationFailed, refreshRequested, adoptionRequested, changePrepared, changeObserved, changeAdopted, changeDismissed, proposalFrozen],
	commands: [failPublication, refresh, requestAdoption, prepare, freeze, observe, adopt, dismiss],
	materializers: [
		publicationFailedMaterializer,
		refreshRequestedMaterializer,
		adoptionRequestedMaterializer,
		changePreparedMaterializer,
		changeObservedMaterializer,
		changeAdoptedMaterializer,
		changeDismissedMaterializer,
		proposalFrozenMaterializer,
	],
	queries: [adoptions, world, quay, all, links, watchable, publishing],
});
