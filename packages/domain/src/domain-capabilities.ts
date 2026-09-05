import { artifactsLayer } from "@antumbra/artifacts";
import { BoardsLive } from "@antumbra/boards";
import { changesLayer } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { PiecesLive } from "@antumbra/pieces";
import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { ReportsLive } from "@antumbra/reports";
import { ReposLive } from "@antumbra/repos";
import { RulingsLive } from "@antumbra/rulings";
import { RulingHoldsLive } from "@antumbra/rulings/holds/service";
import { RulingReplies } from "@antumbra/rulings/replies/service";
import { SessionEventJournalLive } from "@antumbra/session-event-journal";
import { SessionDrain } from "@antumbra/sessions/drain/service";
import { SessionRegistration } from "@antumbra/sessions/registration/service";
import { SessionRestart } from "@antumbra/sessions/restart/service";
import { SessionRetirement } from "@antumbra/sessions/retirement/service";
import { SessionTreeAudits } from "@antumbra/sessions/tree/audit/service";
import { SessionTreeLedger } from "@antumbra/sessions/tree/ledger/service";
import { SessionTreeLifecycle } from "@antumbra/sessions/tree/lifecycle/service";
import { SessionTreeRows } from "@antumbra/sessions/tree/rows/service";
import { SessionTrees } from "@antumbra/sessions/tree/service";
import { Voyages } from "@antumbra/voyages";
import { VoyageAuthority } from "@antumbra/voyages/authority/service";
import { Layer } from "effect";
import { AgentBirth } from "#agent-birth/service.ts";
import { CaptainMembershipLive } from "#captain-membership.ts";
import { ExecutionSource } from "#execution/service.ts";
import { sessionReachLayer } from "#kernel-reach/session.ts";
import { Quay } from "#quay/service.ts";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { VoyageSummaries } from "#voyage/summaries/service.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

export const domainCapabilities = (
	changeHosts: ReadonlyMap<string, ChangeHost>,
	runners: ReadonlyMap<string, Runner>,
	artifactsDirectory: string,
) => {
	const foundations = Layer.mergeAll(
		VoyageAuthority.layer,
		PiecesLive,
		BoardsLive,
		artifactsLayer(artifactsDirectory),
		ReportsLive,
		ReposLive,
		RulingHoldsLive.pipe(Layer.provideMerge(RulingsLive)),
		Layer.mergeAll(SessionTreeAudits.layer, SessionTreeLifecycle.layer).pipe(
			Layer.provideMerge(Layer.mergeAll(SessionTreeLedger.layer, SessionTreeRows.layer, SessionEventJournalLive)),
		),
		SessionTrees.layer,
		SessionRegistration.layer,
		SessionDrain.layer,
		SessionRetirement.layer,
		SessionRestart.layer,
		sessionReachLayer,
	).pipe(Layer.provideMerge(Voyages.layer), Layer.provideMerge(DomainFeedsLive));
	const changes = changesLayer(changeHosts, runners).pipe(Layer.provideMerge(foundations));
	const world = Layer.mergeAll(VoyageSummaries.layer, ExecutionSource.layer, Quay.layer, VoyageDetails.layer).pipe(Layer.provideMerge(changes));
	return Layer.mergeAll(AgentBirth.layer, RulingReplies.layer, CaptainMembershipLive, VoyageProcedureService.layer).pipe(Layer.provideMerge(world));
};
