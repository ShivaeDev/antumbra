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
import { SessionEventJournalLive } from "@antumbra/session-event-journal";
import { SessionStandDownLive } from "@antumbra/sessions/stand-down/service";
import { Voyages } from "@antumbra/voyages";
import { Layer } from "effect";
import { VoyageAuthority } from "#authority/service.ts";
import { CaptainMembershipLive } from "#captain-membership.ts";
import { ExecutionSource } from "#execution/service.ts";
import { KernelReachDeferredLive } from "#kernel-reach.ts";
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
		SessionEventJournalLive,
		KernelReachDeferredLive,
	).pipe(Layer.provideMerge(Voyages.layer), Layer.provideMerge(DomainFeedsLive));
	const changes = changesLayer(changeHosts, runners).pipe(Layer.provideMerge(foundations));
	const world = Layer.mergeAll(VoyageSummaries.layer, ExecutionSource.layer, Quay.layer, VoyageDetails.layer).pipe(Layer.provideMerge(changes));
	return Layer.mergeAll(CaptainMembershipLive, SessionStandDownLive, VoyageProcedureService.layer).pipe(Layer.provideMerge(world));
};
