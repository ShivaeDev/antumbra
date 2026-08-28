import { BoardScope, Boards, BoardsLive } from "@antumbra/boards";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { temporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { afterAll } from "vitest";
import { linkedBoardId } from "#owner.ts";

const temporary = temporaryPersistence();

afterAll(temporary.remove);

// why: the database Layer is used bare, without the harness's test
// transaction, so every db.transaction here opens a real one.
const layer = BoardsLive.pipe(
	Layer.provideMerge(DomainFeedsLive),
	Layer.provideMerge(temporary.layer),
);

const createAgent = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "take in mail written under a transaction",
			id: agentId,
			role: "hand",
			status: "alive",
		});
	});

const mailFor = (toAgentId: string, sourceRef: string) => ({
	authorAgentId: Option.none<string>(),
	body: `mail ${sourceRef}`,
	precedence: "routine" as const,
	sourceRef,
	toAgentId,
});

it.effect("mail written inside a caller's transaction joins it", () =>
	Effect.gen(function* () {
		const db = yield* Database;
		const boards = yield* Boards;
		const agentId = "agent-nested-mail";
		yield* createAgent(agentId);
		const input = mailFor(agentId, "ruling:nested-1");

		const seenInside = yield* db.transaction(
			Effect.gen(function* () {
				const inner = yield* Database;
				const entry = yield* boards.mail(input);
				return yield* inner.BoardEntry.where({ id: entry.id }).exists();
			}),
		);

		expect(seenInside).toBe(true);
		const boardId = yield* linkedBoardId(BoardScope.Agent({ agentId }));
		expect(Option.isSome(boardId)).toBe(true);
		expect(yield* db.BoardEntry.all()).toMatchObject([
			{ kind: "mail", sourceRef: "ruling:nested-1" },
		]);
	}).pipe(Effect.provide(layer)),
);

it.effect("concurrent mail to one board lands every distinct source", () =>
	Effect.gen(function* () {
		const db = yield* Database;
		const boards = yield* Boards;
		const agentId = "agent-concurrent-mail";
		yield* createAgent(agentId);
		const boardsBefore = (yield* db.Board.all()).length;

		const landed = yield* Effect.all(
			[
				boards.mail(mailFor(agentId, "ruling:concurrent-1")),
				boards.mail(mailFor(agentId, "ruling:concurrent-2")),
			],
			{ concurrency: "unbounded" },
		);

		const boardId = yield* linkedBoardId(BoardScope.Agent({ agentId }));
		const rows = yield* db.BoardEntry.where({
			boardId: Option.getOrThrow(boardId),
		})
			.orderBy((entry) => entry.seq.asc())
			.all();
		expect(landed.map((entry) => entry.sourceRef).sort()).toEqual([
			"ruling:concurrent-1",
			"ruling:concurrent-2",
		]);
		expect(rows.map((row) => row.seq)).toEqual([1, 2]);
		expect(yield* db.Board.all()).toHaveLength(boardsBefore + 1);
	}).pipe(Effect.provide(layer)),
);
