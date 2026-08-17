import { ArtifactsLive } from "@antumbra/artifacts";
import { BoardsLive } from "@antumbra/boards";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { PiecesLive } from "@antumbra/pieces";
import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { ReportsLive } from "@antumbra/reports";
import { ReposLive } from "@antumbra/repos";
import { SessionEventJournalLive } from "@antumbra/session-event-journal";
import { Layer } from "effect";
import { CaptainMembershipLive } from "#captain-membership.ts";
import { ChangeProceduresLive } from "#change-procedures.ts";
import { ChangeSubmissionsLive } from "#change-submissions/change-submissions.ts";
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
		PiecesLive,
		BoardsLive,
		ArtifactsLive(artifactsDirectory),
		ReportsLive,
		ReposLive,
		SessionEventJournalLive,
		KernelReachDeferredLive,
		VoyageWorldSourceLive,
	).pipe(Layer.provideMerge(DomainFeedsLive));
	const submissions = ChangeSubmissionsLive(changeHosts, runners).pipe(
		Layer.provideMerge(foundations),
	);
	return Layer.mergeAll(
		CaptainMembershipLive,
		ChangeProceduresLive(changeHosts),
		StandDownLive,
		VoyageProceduresLive,
	).pipe(Layer.provideMerge(submissions));
};
