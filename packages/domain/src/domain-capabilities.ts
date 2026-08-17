import { ArtifactsLive } from "@antumbra/artifacts";
import { BoardsLive } from "@antumbra/boards";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { PiecesLive } from "@antumbra/pieces";
import type { ChangeHost, Runner } from "@antumbra/plugin-api";
import { ReportsLive } from "@antumbra/reports";
import { ReposLive } from "@antumbra/repos";
import { Layer } from "effect";
import { ChangeSubmissionsLive } from "#change-submissions/change-submissions.ts";

export const domainCapabilities = (
	changeHosts: ReadonlyMap<string, ChangeHost>,
	runners: ReadonlyMap<string, Runner>,
	artifactsDirectory: string,
) => {
	const outcomes = Layer.mergeAll(
		PiecesLive,
		BoardsLive,
		ArtifactsLive(artifactsDirectory),
		ReportsLive,
		ReposLive,
	).pipe(Layer.provideMerge(DomainFeedsLive));
	return ChangeSubmissionsLive(changeHosts, runners).pipe(
		Layer.provideMerge(outcomes),
	);
};
