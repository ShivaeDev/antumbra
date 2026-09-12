import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { scriptedPieces } from "@antumbra/pieces/testing";
import { scriptedRoleSettings } from "@antumbra/settings/testing";
import { Voyages } from "@antumbra/voyages";
import { scriptedVoyages } from "@antumbra/voyages/testing";
import { Effect, Layer } from "effect";
import { RulingsLive } from "#rulings.ts";

export const layer = RulingsLive.pipe(
	Layer.provideMerge(scriptedPieces),
	Layer.provideMerge(scriptedVoyages),
	Layer.provide(scriptedRoleSettings),
	Layer.provide(DomainFeedsLive),
);

export const requesterId = "agent-hand";
export const voyageId = "voyage-reef";
export const pieceId = "piece-soundings";
export const repoId = "repo-charts";

export const seedFleet = Effect.gen(function* () {
	const db = yield* Database;
	const sailing = yield* Voyages;
	const pieces = yield* Pieces;
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
	yield* pieces.charter({
		charter: "sound the shallows",
		dependsOn: [],
		expectation: "the soundings are landed",
		id: pieceId,
		role: "hand",
		title: "Sound",
		voyageId,
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
