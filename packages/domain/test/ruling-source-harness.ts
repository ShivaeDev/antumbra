import { ChangesLive } from "@antumbra/changes";
import type { OpenRulingsView, RulingFailure, StandingRulingsView } from "@antumbra/contract";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { PiecesLive } from "@antumbra/pieces";
import { RulingsLive } from "@antumbra/rulings";
import { Deferred, Effect, Layer, Stream } from "effect";
import { RulingSourceLive } from "#ruling-source.ts";
import { VoyageWorldSourceLive } from "#voyage-world.ts";

export const layer = RulingSourceLive.pipe(
	Layer.provideMerge(VoyageWorldSourceLive),
	Layer.provideMerge(ChangesLive(new Map(), new Map())),
	Layer.provideMerge(PiecesLive),
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
	// why: the rung a question waits on is read off the asker's crew row, so a
	// rehearsal that wants the window's own reading crews the asker first.
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

// why: the watcher must hold the feed's opening snapshot before the act under
// test lands, or an emission it never reacted to would pass for one.
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
