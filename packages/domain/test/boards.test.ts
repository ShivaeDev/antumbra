import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";

const voyage = (id: string) => ({
	captainBackend: "scripted",
	context: "the reef is uncharted",
	crewBackend: "scripted",
	id,
	name: "Chart the reef",
	northStar: "every shoal is known",
});

const noted = (body: string) =>
	EntryInput.Note({
		authorAgentId: Option.none<string>(),
		body,
		register: "smooth" as const,
	});

it.effectApp("every durable entity carries its own board", function* ({ db }) {
	const boards = yield* Boards;
	yield* db.Voyage.create(voyage("boards-entities-voyage"));
	yield* db.Piece.create({
		charter: "sound the shallows",
		expectation: "soundings are landed",
		id: "boards-entities-piece",
		role: "hand",
		title: "alpha",
	});
	yield* db.Agent.create({
		charter: "sound the shallows",
		id: "boards-entities-agent",
		role: "hand",
		status: "alive",
	});
	const scopes: ReadonlyArray<BoardScope> = [
		BoardScope.Voyage({ voyageId: "boards-entities-voyage" }),
		BoardScope.Piece({ pieceId: "boards-entities-piece" }),
		BoardScope.Agent({ agentId: "boards-entities-agent" }),
	];
	yield* Effect.forEach(scopes, (scope) => boards.write(scope, noted(`written to ${scope._tag}`)));
	for (const scope of scopes) {
		expect(yield* boards.read(scope)).toMatchObject([{ body: `written to ${scope._tag}` }]);
	}
});

it.effectApp("an entity has one board, however often it is asked for", function* ({ db }) {
	const boards = yield* Boards;
	const voyageId = "boards-one-voyage";
	yield* db.Voyage.create(voyage(voyageId));
	const scope = BoardScope.Voyage({ voyageId });
	const first = yield* boards.ensure(scope);
	expect(yield* boards.ensure(scope)).toBe(first);
	yield* boards.write(scope, noted("the reef is charted north"));
	expect(yield* boards.ensure(scope)).toBe(first);
	expect((yield* boards.read(scope)).length).toBe(1);
});

it.effectApp("an entity nobody has written to reads as an empty board", function* ({ db }) {
	const boards = yield* Boards;
	const voyageId = "boards-empty-voyage";
	yield* db.Voyage.create(voyage(voyageId));
	expect(yield* boards.read(BoardScope.Voyage({ voyageId }))).toEqual([]);
});
