import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { ASKER, crewLadder, type Ladder } from "#test/captain-verdict-fixtures.ts";
import { callTool } from "#test/harness.ts";

const PIECE = {
	charter: "sound the eastern shoal",
	expectation: "the shoal is sounded",
	role: "hand",
};

const asks = (voyageId: string, urgency: "blocking" | "pressing") =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		return yield* rulings.request({
			choices: [],
			context: "the chart and the soundings disagree",
			gates: [],
			question: "which reading do we trust?",
			radius: "voyage",
			requester: { agentId: ASKER, kind: "agent" },
			rung: "captain",
			subjects: [{ id: voyageId, kind: "voyage" }],
			urgency,
		});
	});

const piecesOf = (voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return Option.getOrThrow(yield* domain.voyages.read(voyageId)).pieces.map((piece) => piece.id);
	});

const noticeOf = (text: string): ReadonlyArray<string> => text.split("\n").slice(1);

const captainCharters = (ladder: Ladder, title: string) => callTool(ladder.captain, "charter_piece", { ...PIECE, dependsOn: [], title });

const flagshipCharters = (ladder: Ladder, title: string) =>
	callTool(ladder.flagship, "charter_piece_on_voyage", { ...PIECE, title, voyageId: ladder.voyageId });

it.effectApp(
	"a captain charters while a blocking question stands, and the reply names it until it is ruled",
	{ clock: "live" },
	function* ({ scripted }) {
		const ladder = yield* crewLadder(scripted);
		const asked = yield* asks(ladder.voyageId, "blocking");

		const outcome = yield* captainCharters(ladder, "eastern");

		expect(outcome.ok).toBe(true);
		expect(noticeOf(outcome.text)).toEqual([`this voyage has 1 open blocking question: ruling ${asked.id}`]);

		expect((yield* callTool(ladder.captain, "rule_on", { answer: "trust the soundings", rulingId: asked.id })).ok).toBe(true);
		const ruled = yield* captainCharters(ladder, "western");

		expect(noticeOf(ruled.text)).toEqual(["this voyage has 1 other chartered piece not yet launched"]);
	},
);

it.effectApp("the reply counts the pieces waiting to launch, and launched or parked ones drop out", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	for (const title of ["alpha", "bravo"]) {
		expect((yield* captainCharters(ladder, title)).ok).toBe(true);
	}
	const [alpha = "", bravo = ""] = yield* piecesOf(ladder.voyageId);

	const third = yield* captainCharters(ladder, "charlie");

	expect(noticeOf(third.text)).toEqual(["this voyage has 2 other chartered pieces not yet launched"]);

	expect((yield* callTool(ladder.captain, "launch_piece", { pieceId: alpha })).ok).toBe(true);
	expect((yield* callTool(ladder.captain, "park_piece", { pieceId: bravo })).ok).toBe(true);
	const fourth = yield* captainCharters(ladder, "delta");

	const [unlaunched = "", pace = ""] = noticeOf(fourth.text);
	expect(unlaunched).toBe("this voyage has 1 other chartered piece not yet launched");
	expect(pace).toContain("waiting for capacity; the fleet runs at most 4 agents at once");
});

it.effectApp("a first charter on a quiet voyage carries no notice", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const outcome = yield* captainCharters(ladder, "eastern");

	const [piece = ""] = yield* piecesOf(ladder.voyageId);
	expect(outcome).toEqual({ ok: true, text: `chartered ${piece}` });
});

it.effectApp("a question below blocking is not on the notice", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	yield* asks(ladder.voyageId, "pressing");

	const outcome = yield* captainCharters(ladder, "eastern");

	expect(noticeOf(outcome.text)).toEqual([]);
});

it.effectApp("the flagship charters on a voyage whose question stands, and reads the same notice", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* asks(ladder.voyageId, "blocking");

	const outcome = yield* flagshipCharters(ladder, "eastern");

	const [piece = ""] = yield* piecesOf(ladder.voyageId);
	expect(outcome).toEqual({
		ok: true,
		text: `chartered ${piece} on voyage ${ladder.voyageId}\nthis voyage has 1 open blocking question: ruling ${asked.id}`,
	});
});
