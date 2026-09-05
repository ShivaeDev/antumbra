import { Artifacts } from "@antumbra/artifacts";
import { Changes } from "@antumbra/changes";
import { type AdoptChangeRequest, ArtifactMarkdownFailure, type ReportMarkdown, SightFailure, VoyageSource } from "@antumbra/contract";
import { type ReportReading, Reports } from "@antumbra/reports";
import { Effect, Layer, Option } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { ChangeProcedureService } from "#change-procedures.ts";
import { changeView } from "#change-view.ts";
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
		const changeProcedures = yield* ChangeProcedureService;
		const domain = yield* AgentDomain;
		const runtime = Effect.all({
			attached: domain.sessionsAttached,
			delegating: domain.sessionsDelegating,
		});
		const reads = yield* makeVoyageReads(runtime);
		const acts = yield* makeVoyageActs(reads);
		const refreshes = yield* makeVoyageRefreshes;
		const quay = Effect.gen(function* () {
			const reading = yield* changeProcedures.quay;
			return quaySeen(reading, yield* changeProcedures.capabilities);
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
			refreshChanges: changeProcedures.requestRefresh,
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
