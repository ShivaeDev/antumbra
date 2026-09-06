import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import type { DirectTool } from "@antumbra/plugin-api";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { compileBoardTools } from "#board-tools.ts";

const COVERED = ["sounded the eastern shoal at low water", "the channel buoy is adrift"];

const SUMMARY = "The eastern shoal was sounded and the channel buoy was found adrift.";

const TAIL = "the buoy is back on station";

const readBoard = (tools: ReadonlyArray<DirectTool>) => Option.getOrThrow(Option.fromUndefinedOr(tools.find((tool) => tool.name === "read_board")));

const smoothedVoyage = Effect.fnUntraced(function* () {
	const boards = yield* Boards;
	const voyageRecords = yield* Voyages;
	const voyage = yield* voyageRecords.open({ context: "the reef is uncharted", name: "Chart the reef", northStar: "every shoal is known" });
	const scope = BoardScope.Voyage({ voyageId: voyage.id });
	const write = (body: string) => boards.write(scope, EntryInput.Note({ authorAgentId: Option.some("agent-hand"), body, register: "rough" }));
	yield* Effect.forEach(COVERED, write);
	const summary = yield* boards.write(
		scope,
		EntryInput.Summary({ authorAgentId: Option.some("agent-smoother"), body: SUMMARY, coversFrom: 1, coversTo: 2, level: "day" }),
	);
	yield* write(TAIL);
	return { summaryId: summary.id, voyageId: voyage.id };
});

const boardToolsFor = Effect.fnUntraced(function* (voyageId: string) {
	return readBoard(
		yield* compileBoardTools({ agentId: "agent-hand", pieceId: Option.none(), sessionId: "session-hand", voyageId: Option.some(voyageId) }),
	);
});

it.effectApp("reading a board gives the summary in place of what it covers, newest first", function* () {
	const board = yield* smoothedVoyage();
	const tool = yield* boardToolsFor(board.voyageId);

	const read = yield* tool.call({ scope: "voyage" });

	expect(read.ok).toBe(true);
	expect(read.text).toBe(`[rough] ${TAIL}\n[summary ${board.summaryId}] ${SUMMARY}`);
});

it.effectApp("naming a summary opens the notes behind it", function* () {
	const board = yield* smoothedVoyage();
	const tool = yield* boardToolsFor(board.voyageId);

	const read = yield* tool.call({ scope: "voyage", summaryId: board.summaryId });

	expect(read.text).toBe(`[rough] ${COVERED[1]}\n[rough] ${COVERED[0]}`);
	expect((yield* tool.call({ scope: "voyage", summaryId: "no-such-summary" })).text).toBe("no notes stand behind that summary");
});
