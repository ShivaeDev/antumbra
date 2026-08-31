import { Database } from "@antumbra/persistence";
import { RulingsLive } from "@antumbra/rulings";
import { it } from "@antumbra/testing-runtime/domain";
import { Effect, Layer } from "effect";

export { it };

export const requesterId = "agent-hand";
export const voyageId = "voyage-reef";
export const pieceId = "piece-soundings";
export const repoId = "repo-charts";

const resetFixture = Effect.gen(function* () {
	const db = yield* Database;
	const rulings = yield* db.Ruling.all();
	for (const ruling of rulings) {
		yield* db.Ruling.where({ id: ruling.id }).update({ answerChoiceId: null, supersededById: null });
	}
	for (const ruling of rulings) {
		yield* db.RulingGate.where({ rulingId: ruling.id }).deleteAll();
		yield* db.RulingSubject.where({ rulingId: ruling.id }).deleteAll();
		yield* db.RulingReclassification.where({ rulingId: ruling.id }).deleteAll();
		yield* db.RulingChoice.where({ rulingId: ruling.id }).deleteAll();
		yield* db.Ruling.where({ id: ruling.id }).deleteAll();
	}
	yield* db.Piece.where({ id: pieceId }).deleteAll();
	yield* db.Voyage.where({ id: voyageId }).deleteAll();
	yield* db.Repo.where({ id: repoId }).deleteAll();
	yield* db.Agent.where({ id: requesterId }).deleteAll();
});

export const layer = Layer.unwrap(resetFixture.pipe(Effect.as(RulingsLive)));

export const seedFleet = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "sound the shallows",
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
