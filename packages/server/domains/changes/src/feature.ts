import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceOutcome } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { heldResource } from "@antumbra/domain-reclamation/rows/held-resource.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { adopt } from "#commands/adopt.ts";
import { adoptionFailed, adoptionFailedMaterializer, failAdoption } from "#commands/adoption-failed.ts";
import { archive } from "#commands/archive.ts";
import { claimRows } from "#commands/claims.ts";
import { dismiss } from "#commands/dismiss.ts";
import { freeze } from "#commands/freeze.ts";
import {
	hostCapabilities,
	hostCapability,
	hostCapabilityMaterializer,
	hostCapabilityObserved,
	observeHostCapability,
} from "#commands/host-capability.ts";
import { observe } from "#commands/observe.ts";
import { prepare } from "#commands/prepare.ts";
import { failPublication, publicationFailed, publicationFailedMaterializer } from "#commands/publication-failed.ts";
import { changeRefresh, refresh, refreshRequested, refreshRequestedMaterializer } from "#commands/refresh.ts";
import { adoptionRequested, adoptionRequestedMaterializer, requestAdoption } from "#commands/request-adoption.ts";
import { adoptionRetried, adoptionRetriedMaterializer, retryAdoption } from "#commands/retry-adoption.ts";
import { changeAdopted } from "#facts/change-adopted.ts";
import { changeArchived } from "#facts/change-archived.ts";
import { changeDismissed } from "#facts/change-dismissed.ts";
import { changeObserved } from "#facts/change-observed.ts";
import { changePrepared } from "#facts/change-prepared.ts";
import { proposalFrozen } from "#facts/proposal-frozen.ts";
import { changeAdoptedMaterializer } from "#materializers/change-adopted.ts";
import { changeArchivedMaterializer } from "#materializers/change-archived.ts";
import { changeDismissedMaterializer } from "#materializers/change-dismissed.ts";
import { changeObservedMaterializer } from "#materializers/change-observed.ts";
import { changePreparedMaterializer } from "#materializers/change-prepared.ts";
import { proposalFrozenMaterializer } from "#materializers/proposal-frozen.ts";
import { adoptions } from "#queries/adoptions.ts";
import { all } from "#queries/all.ts";
import { archivable } from "#queries/archivable.ts";
import { browse } from "#queries/browse.ts";
import { byPiece } from "#queries/by-piece.ts";
import { links } from "#queries/links.ts";
import { publishing } from "#queries/publishing.ts";
import { quay } from "#queries/quay.ts";
import { sessionSituations } from "#queries/session-situations.ts";
import { watchable } from "#queries/watchable.ts";
import { world } from "#queries/world.ts";
import { archiving } from "#reconcilers/archiving.ts";
import { adoptionRequest } from "#rows/adoption-request.ts";
import { change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
import { changeVerdict } from "#rows/change-verdict.ts";
import { pieceChange } from "#rows/piece-change.ts";
import { pieceChangeView } from "#rows/piece-change-view.ts";
import { quayChange } from "#rows/quay-change.ts";
import { sessionSituation } from "#rows/session-situation.ts";
export const changes = feature("changes", {
	rows: [
		pieceChangeView,
		hostCapability,
		sessionSituation,
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
	facts: [
		adoptionFailed,
		adoptionRetried,
		hostCapabilityObserved,
		publicationFailed,
		refreshRequested,
		adoptionRequested,
		changePrepared,
		changeObserved,
		changeAdopted,
		changeArchived,
		changeDismissed,
		proposalFrozen,
	],
	commands: [
		failAdoption,
		retryAdoption,
		observeHostCapability,
		failPublication,
		refresh,
		requestAdoption,
		prepare,
		freeze,
		observe,
		adopt,
		archive,
		dismiss,
	],
	materializers: [
		adoptionFailedMaterializer,
		adoptionRetriedMaterializer,
		hostCapabilityMaterializer,
		publicationFailedMaterializer,
		refreshRequestedMaterializer,
		adoptionRequestedMaterializer,
		changePreparedMaterializer,
		changeObservedMaterializer,
		changeAdoptedMaterializer,
		changeArchivedMaterializer,
		changeDismissedMaterializer,
		proposalFrozenMaterializer,
	],
	queries: [byPiece, hostCapabilities, browse, sessionSituations, adoptions, world, quay, all, links, watchable, publishing, archivable],
	reconcilers: [archiving],
});
