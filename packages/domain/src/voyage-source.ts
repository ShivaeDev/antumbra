import { Boards } from "@antumbra/boards";
import { type AdoptChangeRequest, ArtifactMarkdownFailure, type ReportMarkdown, SightFailure, VoyageSource } from "@antumbra/contract";
import type { ReportReading } from "@antumbra/reports";
import { Context, Effect, Layer, Option } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { ChangeProcedureService } from "#change-procedures.ts";
import { changeView } from "#change-view.ts";
import { quaySeen } from "#quay-projection.ts";
import { failureMessage, toFailure } from "#sight-failure.ts";
import { makeVoyageActs } from "#voyage-acts.ts";
import { makeVoyageRefreshes } from "#voyage-feed.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";
import { changeSeen } from "#voyage-projection.ts";
import { makeVoyageReads } from "#voyage-reads.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

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
		const boards = yield* Boards;
		const changes = yield* ChangeProcedureService;
		const domain = yield* AgentDomain;
		const voyages = yield* VoyageProcedureService;
		const world = yield* VoyageWorldSource;
		const context = Context.make(Boards, boards).pipe(Context.add(VoyageProcedureService, voyages), Context.add(VoyageWorldSource, world));
		// why: what this process is holding is asked of the domain rather than of
		// the rows, for the same reason the fleet asks — a row still saying active
		// has outlived the process that made it true, and a crew is only quiet if
		// the thing that would be speaking for it is quiet.
		const runtime = Effect.all({
			attached: domain.sessionsAttached,
			delegating: domain.sessionsDelegating,
		});
		const reads = yield* Effect.provide(makeVoyageReads(runtime), context);
		const acts = yield* Effect.provide(makeVoyageActs(reads), context);
		const refreshes = yield* makeVoyageRefreshes;
		const quay = Effect.gen(function* () {
			const reading = yield* changes.quay;
			return quaySeen(reading, yield* changes.capabilities);
		}).pipe(Effect.mapError(toFailure));
		return {
			...acts,
			artifactMarkdown: (artifactId: string) => voyages.artifactMarkdown(artifactId).pipe(Effect.mapError(artifactMarkdownFailure)),
			// why: a change made by hand was opened by nobody this system spawned,
			// so it is adopted with no agent behind it — the act of the person at
			// the window, recorded as such rather than credited to the crew.
			adoptChange: (request: AdoptChangeRequest) =>
				changes.adopt({ agentId: null, ...request }).pipe(
					Effect.map((row) => changeSeen(changeView(request.repoName, row))),
					Effect.mapError(toFailure),
				),
			// why: the admiral's own verdict on a change nobody will finish, so it
			// is recorded as the act of the person at the window — no agent asked
			// for it and none is credited with it.
			dismissChange: (changeId: string) => changes.dismiss(changeId).pipe(Effect.mapError(toFailure)),
			quay,
			quayFeed: refreshes(quay),
			refreshChanges: changes.requestRefresh,
			reportMarkdown: (reportId: string) =>
				voyages.readReport(reportId).pipe(
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
