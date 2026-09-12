import { answered, it } from "@antumbra/app-testing/entry.ts";
import { agentBoard, pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred } from "effect";
import { expect } from "vitest";
import { boundSummaryTool, type SummaryWritten, writeSummaryTool } from "#tools/boards/summary.ts";
import { markReadTool, readBoardTool, readMailTool, writeBoardTool } from "#tools/boards/tools.ts";

const context: ToolContext = { agentId: "agent-reader", sessionId: "session-reader", callId: "native-call" };

it.app("writes one rough note for a replayed native call and keeps separate sessions independent", function* (app) {
	const input = { scope: "self", body: "Check the tide" };
	expect(yield* writeBoardTool.invoke(context, input)).toEqual({ ok: true, text: "written to the self board" });
	expect(yield* writeBoardTool.invoke(context, input)).toEqual({ ok: true, text: "written to the self board" });
	yield* writeBoardTool.invoke({ ...context, sessionId: "session-other" }, input);
	const entries = yield* answered(app.api.boards.entries({ board: agentBoard(context.agentId) }));
	expect(entries).toHaveLength(2);
	expect(entries[0]).toMatchObject({ register: "rough", authorAgentId: context.agentId, body: "Check the tide" });
	expect(yield* readBoardTool.invoke(context, { scope: "self" })).toEqual({ ok: true, text: "[rough] Check the tide\n[rough] Check the tide" });
});

it.app("refuses an unbound board and malformed input before recording anything", function* (app) {
	expect(yield* writeBoardTool.invoke(context, { scope: "piece", body: "hello" })).toEqual({ ok: false, text: "you have no piece board" });
	expect(yield* readBoardTool.invoke(context, { scope: "voyage" })).toEqual({ ok: false, text: "you have no voyage board" });
	expect((yield* writeBoardTool.invoke(context, { scope: "self" })).ok).toBe(false);
	expect(yield* app.rows.boardEntry.count({})).toBe(0);
});

it.app("reads a digest and the exact rough notes behind its summary", function* (app) {
	const board = agentBoard(context.agentId);
	yield* writeBoardTool.invoke(context, { scope: "self", body: "The tide turned" });
	yield* app.api.boards.summarize({
		board,
		author: "smoother",
		body: "The approach changed",
		coversFrom: 1,
		coversTo: 1,
		level: "day",
		requestId: Request.make("summary"),
	});
	expect(yield* readBoardTool.invoke(context, { scope: "self" })).toEqual({ ok: true, text: "[summary summary] The approach changed" });
	expect(yield* readBoardTool.invoke(context, { scope: "self", summaryId: "summary" })).toEqual({ ok: true, text: "[rough] The tide turned" });
	expect(yield* readBoardTool.invoke(context, { scope: "self", summaryId: "missing" })).toEqual({
		ok: true,
		text: "no notes stand behind that summary",
	});
});

it.app("reads only the actor's mail without marking it, then marks only addressed messages", function* (app) {
	yield* app.api.mail.send({
		toAgentId: context.agentId,
		authorAgentId: null,
		body: "Sound the channel",
		precedence: "routine",
		requestId: Request.make("mail-own"),
	});
	yield* app.api.mail.send({
		toAgentId: "other-agent",
		authorAgentId: null,
		body: "Other orders",
		precedence: "routine",
		requestId: Request.make("mail-other"),
	});
	const read = yield* readMailTool.invoke(context, null);
	expect(read.ok).toBe(true);
	expect(read.text).toContain("mail-own [routine]");
	expect(read.text).toContain("— Sound the channel");
	expect(read.text).not.toContain("Other orders");
	expect(yield* readMailTool.invoke(context, {})).toEqual(read);
	expect((yield* markReadTool.invoke(context, { entryIds: ["mail-other"] })).ok).toBe(false);
	expect(yield* markReadTool.invoke(context, { entryIds: ["mail-own"] })).toEqual({ ok: true, text: "marked read" });
	expect(yield* markReadTool.invoke(context, { entryIds: ["mail-own"] })).toEqual({ ok: true, text: "marked read" });
	expect(yield* readMailTool.invoke(context, {})).toEqual({ ok: true, text: "No mail." });
});

it.app("binds a summary to its own smoothing session and accepts only the first result", function* () {
	const written = yield* Deferred.make<SummaryWritten>();
	const tool = boundSummaryTool(written);
	expect(yield* tool.invoke(context, { text: "First summary" })).toEqual({ ok: true, text: "summary written" });
	yield* tool.invoke(context, { text: "Later summary" });
	expect(yield* Deferred.await(written)).toEqual({ _tag: "written", text: "First summary" });
	const empty = boundSummaryTool(yield* Deferred.make<SummaryWritten>());
	expect(yield* empty.invoke(context, { text: " " })).toEqual({ ok: true, text: "the summary was empty" });
});

it.app("writes a bound piece summary and its voyage handoff once", function* (app) {
	const voyageId = VoyageId.make("summary-voyage");
	const pieceId = PieceId.make("summary-piece");
	yield* app.api.voyages.open({
		name: "Summary voyage",
		northStar: "Every shoal known",
		context: "",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
		requestId: Request.make(voyageId),
	});
	yield* app.api.pieces.charter({
		voyageId,
		title: "Soundings",
		charter: "Chart it",
		expectation: "Soundings recorded",
		role: "hand",
		dependsOn: [],
		requestId: Request.make(pieceId),
	});
	const board = pieceBoard(pieceId);
	yield* app.api.boards.write({
		board,
		body: "A shoal was found",
		register: "rough",
		author: context.agentId,
		requestId: Request.make("source-note"),
	});
	yield* app.api.boards.requestSmoothing({ voyageId, pieceId, throughToday: false, requestId: Request.make("bound-pass") });
	yield* app.api.boards.bindSmoothingSession({
		sessionId: context.sessionId,
		attemptId: "bound-pass",
		agentId: context.agentId,
		board,
		pieceId,
		title: "Soundings",
		level: "piece",
		coversFrom: 1,
		coversTo: 1,
	});
	expect(yield* writeSummaryTool.invoke(context, { text: "The shoal is recorded" })).toEqual({ ok: true, text: "summary written" });
	yield* writeSummaryTool.invoke(context, { text: "The shoal is recorded" });
	yield* writeSummaryTool.invoke({ ...context, callId: "second-call" }, { text: "Replace the first" });
	expect(yield* answered(app.api.boards.digest({ board }))).toMatchObject([{ kind: "summary", body: "The shoal is recorded" }]);
	expect(yield* answered(app.api.boards.entries({ board: voyageBoard(voyageId) }))).toMatchObject([
		{ kind: "pieceSummary", pieceId, body: "The shoal is recorded" },
	]);
	expect((yield* writeSummaryTool.invoke({ ...context, agentId: "wrong-agent" }, { text: "wrong" })).ok).toBe(false);
});
