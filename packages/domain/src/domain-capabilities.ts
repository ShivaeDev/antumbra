import { ArtifactsLive } from "@antumbra/artifacts";
import { BoardsLive } from "@antumbra/boards";
import { ChangesLive } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { PiecesLive } from "@antumbra/pieces";
import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { ReportsLive } from "@antumbra/reports";
import { ReposLive } from "@antumbra/repos";
import { RulingsLive } from "@antumbra/rulings";
import { RulingHoldsLive } from "@antumbra/rulings/holds/service";
import { SessionEventJournalLive } from "@antumbra/session-event-journal";
import { Layer } from "effect";
import { VoyageAuthority } from "#authority/service.ts";
import { CaptainMembershipLive } from "#captain-membership.ts";
import { ChangeProceduresLive } from "#change-procedures.ts";
import { KernelReachDeferredLive } from "#kernel-reach.ts";
import { StandDownLive } from "#stand-down.ts";
import { VoyageWorldSourceLive } from "#voyage-world.ts";
import { VoyageProceduresLive } from "#voyages.ts";

export const domainCapabilities = (
	changeHosts: ReadonlyMap<string, ChangeHost>,
	runners: ReadonlyMap<string, Runner>,
	artifactsDirectory: string,
) => {
	const foundations = Layer.mergeAll(
		VoyageAuthority.layer,
		PiecesLive,
		BoardsLive,
		ArtifactsLive(artifactsDirectory),
		ReportsLive,
		ReposLive,
		RulingHoldsLive.pipe(Layer.provideMerge(RulingsLive)),
		SessionEventJournalLive,
		KernelReachDeferredLive,
	).pipe(Layer.provideMerge(DomainFeedsLive));
	const changes = ChangesLive(changeHosts, runners).pipe(Layer.provideMerge(foundations));
	const world = VoyageWorldSourceLive.pipe(Layer.provideMerge(changes));
	return Layer.mergeAll(CaptainMembershipLive, ChangeProceduresLive(changeHosts), StandDownLive, VoyageProceduresLive).pipe(
		Layer.provideMerge(world),
	);
};
