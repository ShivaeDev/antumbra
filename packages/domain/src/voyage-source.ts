import { Artifacts } from "@antumbra/artifacts";
import { Changes } from "@antumbra/changes";
import { type AdoptChangeRequest, ArtifactMarkdownFailure, type ReportMarkdown, SightFailure, VoyageSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { type ReportReading, Reports } from "@antumbra/reports";
import { SessionFabric } from "@antumbra/session-fabric";
import { LiveDelegations } from "@antumbra/sessions";
import { Effect, Layer, Option } from "effect";
import { changeView } from "#change-view.ts";
import { Quay } from "#quay/service.ts";
import { quaySeen } from "#quay-projection.ts";
import { failureMessage, toFailure } from "#sight-failure.ts";
import { makeVoyageActs } from "#voyage-acts.ts";
import { makeVoyageRefreshes } from "#voyage-feed.ts";
import { changeSeen } from "#voyage-projection.ts";
import { makeVoyageReads } from "#voyage-reads.ts";

const artifactMarkdownFailure = (cause: unknown) => new ArtifactMarkdownFailure({ message: failureMessage(cause) });

const noSuchReport = (reportId: string) => new SightFailure({ message: `no such report: ${reportId}` });

const reportMarkdown = (reading: ReportReading): ReportMarkdown => ({
	authorAgentId: reading.authorAgentId,
	markdown: reading.body,
	reportId: reading.id,
	title: reading.title,
});

export const VoyageSourceLive = Layer.effect(VoyageSource)(
	Effect.gen(function* () {
		const artifacts = yield* Artifacts;
		const reports = yield* Reports;
		const changes = yield* Changes;
		const quayReader = yield* Quay;
		const feeds = yield* DomainFeeds;
		const fabric = yield* SessionFabric;
		const delegations = yield* LiveDelegations;
		const runtime = Effect.all({
			attached: fabric.attached(),
			delegating: delegations.delegating(),
		});
		const reads = yield* makeVoyageReads(runtime);
		const acts = yield* makeVoyageActs(reads);
		const refreshes = yield* makeVoyageRefreshes;
		const quay = Effect.gen(function* () {
			const reading = yield* quayReader.read();
			return quaySeen(reading, yield* changes.hostCapabilities());
		}).pipe(Effect.mapError(toFailure));
		return {
			...acts,
			artifactMarkdown: (artifactId: string) => artifacts.readMarkdown(artifactId).pipe(Effect.mapError(artifactMarkdownFailure)),
			adoptChange: (request: AdoptChangeRequest) =>
				changes.adopt({ agentId: null, ...request }).pipe(
					Effect.map((row) => changeSeen(changeView(request.repoName, row))),
					Effect.mapError(toFailure),
				),
			dismissChange: (changeId: string) => changes.dismiss(changeId).pipe(Effect.mapError(toFailure)),
			quay,
			quayFeed: refreshes(quay),
			refreshChanges: feeds.publishChangeRefresh(),
			reportMarkdown: (reportId: string) =>
				reports.read(reportId).pipe(
					Effect.mapError(toFailure),
					Effect.flatMap(
						Option.match({
							onNone: () => noSuchReport(reportId),
							onSome: (reading) => Effect.succeed(reportMarkdown(reading)),
						}),
					),
				),
			voyage: reads.voyage,
			voyageFeed: (voyageId: string) => refreshes(reads.voyage(voyageId)),
			voyages: reads.voyages,
			voyagesFeed: refreshes(reads.voyages),
		};
	}),
);
