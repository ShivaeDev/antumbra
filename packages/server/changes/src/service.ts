import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { adopt } from "#commands/adopt.ts";
import { archive } from "#commands/archive.ts";
import { dismiss } from "#commands/dismiss.ts";
import { failAdoption } from "#commands/fail-adoption.ts";
import { failPublication } from "#commands/fail-publication.ts";
import { forwardFeedback } from "#commands/forward-feedback.ts";
import { freeze } from "#commands/freeze.ts";
import { hostCapabilities } from "#commands/host-capabilities.ts";
import { observe } from "#commands/observe.ts";
import { observeHostCapability } from "#commands/observe-host-capability.ts";
import { prepare } from "#commands/prepare.ts";
import { refresh } from "#commands/refresh.ts";
import { requestAdoption } from "#commands/request-adoption.ts";
import { retryAdoption } from "#commands/retry-adoption.ts";
import { initialize } from "#initialize.ts";
import { observeEvidence } from "#observe-evidence.ts";
import { adoptions } from "#queries/adoptions.ts";
import { all } from "#queries/all.ts";
import { archivable } from "#queries/archivable.ts";
import { browse } from "#queries/browse.ts";
import { byPiece } from "#queries/by-piece.ts";
import { cleanupCandidates } from "#queries/cleanup-candidates.ts";
import { links } from "#queries/links.ts";
import { publishing } from "#queries/publishing.ts";
import { quay } from "#queries/quay.ts";
import { sessionSituations } from "#queries/session-situations.ts";
import { watchable } from "#queries/watchable.ts";
import { world } from "#queries/world.ts";
export const Changes = defineService({
	id: "@antumbra/server-changes/Changes",
	requires: [ChangesHistory, ExecutionHistory],
	initialize: initialize,
	methods: (serial) => ({
		cleanupCandidates,
		observeEvidence: observeEvidence(serial),
		failAdoption: failAdoption(serial),
		retryAdoption: retryAdoption(serial),
		observeHostCapability: observeHostCapability(serial),
		failPublication: failPublication(serial),
		refresh: refresh(serial),
		requestAdoption: requestAdoption(serial),
		prepare: prepare(serial),
		freeze: freeze(serial),
		observe: observe(serial),
		adopt: adopt(serial),
		archive: archive(serial),
		dismiss: dismiss(serial),
		forwardFeedback: forwardFeedback(serial),
		byPiece,
		hostCapabilities,
		browse,
		sessionSituations,
		adoptions,
		world,
		quay,
		all,
		links,
		watchable,
		publishing,
		archivable,
	}),
});
