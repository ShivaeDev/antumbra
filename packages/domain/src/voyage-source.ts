import { Boards } from "@antumbra/boards";
import { type AdoptChangeRequest, VoyageSource } from "@antumbra/contract";
import { Context, Effect, Layer } from "effect";
import { ChangeProcedureService } from "#change-procedures.ts";
import { changeView } from "#change-view.ts";
import { quaySeen } from "#quay-projection.ts";
import { toFailure } from "#sight-failure.ts";
import { makeVoyageActs } from "#voyage-acts.ts";
import { makeVoyageRefreshes } from "#voyage-feed.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";
import { changeSeen } from "#voyage-projection.ts";
import { makeVoyageReads } from "#voyage-reads.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export const VoyageSourceLive = Layer.effect(VoyageSource)(
	Effect.gen(function* () {
		const boards = yield* Boards;
		const changes = yield* ChangeProcedureService;
		const voyages = yield* VoyageProcedureService;
		const world = yield* VoyageWorldSource;
		const context = Context.make(Boards, boards).pipe(
			Context.add(VoyageProcedureService, voyages),
			Context.add(VoyageWorldSource, world),
		);
		const reads = yield* Effect.provide(makeVoyageReads, context);
		const acts = yield* Effect.provide(makeVoyageActs(reads), context);
		const refreshes = yield* makeVoyageRefreshes;
		const quay = Effect.gen(function* () {
			const reading = yield* changes.quay;
			return quaySeen(reading, yield* changes.capabilities);
		}).pipe(Effect.mapError(toFailure));
		return {
			...acts,
			// why: a change made by hand was opened by nobody this system spawned,
			// so it is adopted with no agent behind it — the act of the person at
			// the window, recorded as such rather than credited to the crew.
			adoptChange: (request: AdoptChangeRequest) =>
				changes.adopt({ agentId: null, ...request }).pipe(
					Effect.map((row) => changeSeen(changeView(request.repoName, row))),
					Effect.mapError(toFailure),
				),
			quay,
			quayFeed: refreshes(quay),
			refreshChanges: changes.requestRefresh,
			voyage: reads.voyage,
			voyageFeed: (voyageId: string) => refreshes(reads.voyage(voyageId)),
			voyages: reads.voyages,
			voyagesFeed: refreshes(reads.voyages),
		};
	}),
);
