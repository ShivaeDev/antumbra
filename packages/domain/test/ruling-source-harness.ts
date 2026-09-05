import { BoardsLive } from "@antumbra/boards";
import { changesLayer } from "@antumbra/changes";
import type { OpenRulingsView, RulingFailure, StandingRulingsView } from "@antumbra/contract";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { PiecesLive } from "@antumbra/pieces";
import { ReposLive } from "@antumbra/repos";
import { RulingsLive } from "@antumbra/rulings";
import { RulingHoldsLive } from "@antumbra/rulings/holds/service";
import { Deferred, Effect, Layer, Stream } from "effect";
import { RulingSourceLive } from "#ruling-source.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

export const layer = RulingSourceLive.pipe(
	Layer.provideMerge(VoyageWorldSource.layer),
	Layer.provideMerge(changesLayer(new Map(), new Map())),
	Layer.provideMerge(PiecesLive),
	Layer.provideMerge(ReposLive),
	Layer.provideMerge(RulingHoldsLive),
	Layer.provideMerge(BoardsLive),
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(DomainFeedsLive),
);

export const requesterId = "agent-surveyor";
export const voyageId = "voyage-reef";
export const pieceId = "piece-course";

export const seedFleet = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "sound the eastern shoal",
		id: requesterId,
		role: "hand",
		status: "alive",
	});
	yield* db.Voyage.create({
		captainBackend: "scripted",
		context: "the reef is uncharted",
		crewBackend: "scripted",
		id: voyageId,
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	yield* db.Piece.create({
		charter: "plot a course over the shoal",
		expectation: "a course is plotted",
		id: pieceId,
		role: "navigator",
		title: "Plot the course",
	});
	yield* db.VoyagePiece.create({ pieceId, voyageId });
	yield* db.VoyageAgent.create({
		agentId: requesterId,
		role: "hand",
		voyageId,
	});
});

export const asked = {
	choices: [{ detail: "the sounding is fresher", label: "trust the soundings" }, { label: "trust the chart" }],
	context: "the chart and the soundings disagree over the eastern shoal",
	gates: [],
	question: "which reading do we plot against?",
	radius: "voyage",
	requester: { agentId: requesterId, kind: "agent" },
	rung: "captain",
	subjects: [
		{ id: voyageId, kind: "voyage" },
		{ kind: "tag", tag: "surveying" },
	],
	urgency: "blocking",
} as const;

export const watchUntil = <A>(feed: Stream.Stream<A, RulingFailure>, matches: (view: A) => boolean) =>
	Effect.gen(function* () {
		const opened = yield* Deferred.make<void>();
		const watcher = yield* feed.pipe(
			Stream.tap(() => Deferred.succeed(opened, undefined)),
			Stream.filter(matches),
			Stream.take(1),
			Stream.runCollect,
			Effect.forkChild,
		);
		yield* Deferred.await(opened);
		return watcher;
	});

export const anyOpen = (view: OpenRulingsView) => view.rulings.length > 0;
export const noneOpen = (view: OpenRulingsView) => view.rulings.length === 0;
export const oneStanding = (view: StandingRulingsView) => view.rulings.length === 1;
export const anyGated = (view: OpenRulingsView) => view.rulings.some((ruling) => ruling.gatedPieces.length > 0);
