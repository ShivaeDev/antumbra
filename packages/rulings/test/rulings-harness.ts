import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { scriptedRoleSettings } from "@antumbra/settings/testing";
import { Voyages } from "@antumbra/voyages";
import { scriptedVoyages } from "@antumbra/voyages/testing";
import { Effect, Layer } from "effect";
import { RulingsLive } from "#rulings.ts";

export const layer = RulingsLive.pipe(Layer.provideMerge(scriptedVoyages), Layer.provide(scriptedRoleSettings), Layer.provide(DomainFeedsLive));

export const requesterId = "agent-hand";
export const voyageId = "voyage-reef";
export const pieceId = "piece-soundings";
export const repoId = "repo-charts";

export const seedFleet = Effect.gen(function* () {
	const db = yield* Database;
	const sailing = yield* Voyages;
	yield* db.Agent.create({
		charter: "sound the shallows",
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
	yield* db.Piece.create({
		charter: "sound the shallows",
		expectation: "the soundings are landed",
		id: pieceId,
		role: "hand",
		title: "Sound",
	});
	yield* db.Repo.create({
		defaultRef: "main",
		id: repoId,
		name: "charts",
		source: "github:fleet/charts",
	});
});

export const asked = {
	choices: [],
	context: "the reef chart disagrees with the soundings",
	gates: [],
	question: "which reading do we trust?",
	radius: "voyage",
	requester: { agentId: requesterId, kind: "agent" },
	rung: "captain",
	subjects: [],
	urgency: "pressing",
} as const;
