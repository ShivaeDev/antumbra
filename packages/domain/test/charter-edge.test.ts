import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { ASKER, type Ladder, withLadder } from "#test/captain-verdict-fixtures.ts";
import { callTool } from "#test/harness.ts";

const PIECE = {
	charter: "sound the eastern shoal",
	expectation: "the shoal is sounded",
	role: "hand",
};

const blocking = (voyageId: string) =>
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
			urgency: "blocking",
		});
	});

const frontierBlocking = (tool: string, rulingId: string) =>
	`${tool}: FrontierBlocking: a blocking question stands on the voyage's frontier (ruling ${rulingId}) — chartering waits until each is ruled`;

const edgeReached = (tool: string, unlaunched: ReadonlyArray<string>) =>
	`${tool}: EdgeReached: 3 pieces on the voyage are unlaunched (${unlaunched.join(", ")}) — chartering waits until one launches, is parked or is abandoned`;

const pieceCount = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.Piece.all()).length;
});

const piecesOf = (voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return Option.getOrThrow(yield* domain.voyages.read(voyageId)).pieces.map((piece) => piece.id);
	});

const captainCharters = (ladder: Ladder, title: string) => callTool(ladder.captain, "charter_piece", { ...PIECE, dependsOn: [], title });

const flagshipCharters = (ladder: Ladder, title: string) =>
	callTool(ladder.flagship, "charter_piece_on_voyage", { ...PIECE, title, voyageId: ladder.voyageId });

it.live("a captain charters nothing while a crew member's blocking question stands", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const asked = yield* blocking(ladder.voyageId);

			const refusal = yield* captainCharters(ladder, "eastern");

			expect(refusal).toEqual({ ok: false, text: frontierBlocking("charter_piece", asked.id) });
			expect(yield* pieceCount).toBe(0);

			const ruled = yield* callTool(ladder.captain, "rule_on", { answer: "trust the soundings", rulingId: asked.id });
			const outcome = yield* captainCharters(ladder, "eastern");

			expect(ruled.ok).toBe(true);
			expect(outcome.ok).toBe(true);
			expect(yield* pieceCount).toBe(1);
		}),
	),
);

it.live("a question reclassified below blocking holds no charter", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const asked = yield* blocking(ladder.voyageId);
			expect((yield* captainCharters(ladder, "eastern")).ok).toBe(false);

			const moved = yield* callTool(ladder.captain, "reclassify_ruling", { rulingId: asked.id, urgency: "pressing" });
			const outcome = yield* captainCharters(ladder, "eastern");

			expect(moved.ok).toBe(true);
			expect(outcome.ok).toBe(true);
			expect(yield* pieceCount).toBe(1);
		}),
	),
);

it.live("three unlaunched pieces are the edge until one launches, parks or is abandoned", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			for (const title of ["alpha", "bravo", "charlie"]) {
				expect((yield* captainCharters(ladder, title)).ok).toBe(true);
			}
			const [alpha = "", bravo = "", charlie = ""] = yield* piecesOf(ladder.voyageId);

			const refusal = yield* captainCharters(ladder, "delta");

			expect(refusal).toEqual({ ok: false, text: edgeReached("charter_piece", [alpha, bravo, charlie]) });
			expect(yield* pieceCount).toBe(3);

			expect((yield* callTool(ladder.captain, "launch_piece", { pieceId: alpha })).ok).toBe(true);
			expect((yield* captainCharters(ladder, "delta")).ok).toBe(true);
			expect((yield* captainCharters(ladder, "echo")).ok).toBe(false);

			expect((yield* callTool(ladder.captain, "park_piece", { pieceId: bravo })).ok).toBe(true);
			expect((yield* captainCharters(ladder, "echo")).ok).toBe(true);
			expect((yield* captainCharters(ladder, "foxtrot")).ok).toBe(false);

			yield* domain.voyages.landPieceVerdict(charlie, "abandoned");
			expect((yield* captainCharters(ladder, "foxtrot")).ok).toBe(true);
			expect(yield* pieceCount).toBe(6);
		}),
	),
);

it.live("the flagship charters nothing on a voyage whose frontier holds a blocking question", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const asked = yield* blocking(ladder.voyageId);

			const refusal = yield* flagshipCharters(ladder, "eastern");

			expect(refusal).toEqual({ ok: false, text: frontierBlocking("charter_piece_on_voyage", asked.id) });
			expect(yield* pieceCount).toBe(0);

			expect((yield* callTool(ladder.captain, "rule_on", { answer: "trust the soundings", rulingId: asked.id })).ok).toBe(true);
			expect((yield* flagshipCharters(ladder, "eastern")).ok).toBe(true);
		}),
	),
);

it.live("the flagship meets the same edge on a voyage it names", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			for (const title of ["alpha", "bravo", "charlie"]) {
				expect((yield* flagshipCharters(ladder, title)).ok).toBe(true);
			}
			const unlaunched = yield* piecesOf(ladder.voyageId);

			const refusal = yield* flagshipCharters(ladder, "delta");

			expect(refusal).toEqual({ ok: false, text: edgeReached("charter_piece_on_voyage", unlaunched) });

			yield* domain.voyages.launch(unlaunched[0] ?? "");
			expect((yield* flagshipCharters(ladder, "delta")).ok).toBe(true);
			expect(yield* pieceCount).toBe(4);
		}),
	),
);
