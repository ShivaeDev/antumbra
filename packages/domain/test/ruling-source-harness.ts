import { scriptedBoards } from "@antumbra/boards/testing";
import { changesLayer } from "@antumbra/changes";
import type { OpenRulingsView, RulingFailure, StandingRulingsView } from "@antumbra/contract";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { scriptedPieces } from "@antumbra/pieces/testing";
import { RulingsLive } from "@antumbra/rulings";
import { RulingHoldsLive } from "@antumbra/rulings/holds/service";
import { RulingReplies } from "@antumbra/rulings/replies/service";
import { scriptedRoleSettings } from "@antumbra/settings/testing";
import { scriptedMail } from "@antumbra/testing-runtime";
import { Voyages } from "@antumbra/voyages";
import { scriptedVoyages } from "@antumbra/voyages/testing";
import { Deferred, Effect, Layer, Stream } from "effect";
import { RulingSourceLive } from "#ruling-source.ts";

export const layer = RulingSourceLive.pipe(
	Layer.provide(RulingReplies.layer),
	Layer.provideMerge(changesLayer(new Map(), new Map())),
	Layer.provideMerge(RulingHoldsLive),
	Layer.provideMerge(scriptedBoards),
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(Layer.mergeAll(scriptedMail, scriptedPieces)),
	Layer.provideMerge(scriptedVoyages),
	Layer.provide(scriptedRoleSettings),
	Layer.provideMerge(DomainFeedsLive),
);

export const requesterId = "agent-surveyor";
export const voyageId = "voyage-reef";
export const pieceId = "piece-course";

export const seedFleet = Effect.gen(function* () {
	const db = yield* Database;
	const sailing = yield* Voyages;
	yield* db.Agent.create({
		charter: "sound the eastern shoal",
		id: requesterId,
		role: "hand",
		status: "alive",
	});
	yield* sailing.open({
		context: "the reef is uncharted",
		id: voyageId,
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	yield* Effect.flatMap(Pieces, (pieces) =>
		pieces.charter({
			charter: "plot a course over the shoal",
			dependsOn: [],
			expectation: "a course is plotted",
			id: pieceId,
			role: "navigator",
			title: "Plot the course",
			voyageId,
		}),
	);
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
