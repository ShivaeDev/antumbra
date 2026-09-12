import { write } from "@antumbra/domain-boards/commands/write.ts";
import { agentBoard, type BoardId, pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import type { Entry } from "@antumbra/domain-boards/queries/covered.ts";
import { digest } from "@antumbra/domain-boards/queries/digest.ts";
import { under } from "@antumbra/domain-boards/queries/under.ts";
import { markRead } from "@antumbra/domain-mail/commands/mark-read.ts";
import { MessageId } from "@antumbra/domain-mail/ids.ts";
import { unread } from "@antumbra/domain-mail/queries/unread.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { answered, refused } from "@antumbra/platform-tool-schemas/answers.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import type { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { markReadSpec, readBoardSpec, readMailSpec, writeBoardSpec } from "#tools/boards/specs.ts";

const boardOf = (context: ToolContext, scope: "self" | "piece" | "voyage"): BoardId | undefined => {
	if (scope === "self") return agentBoard(context.agentId);
	if (scope === "piece") return context.pieceId === undefined ? undefined : pieceBoard(PieceId.make(context.pieceId));
	return context.voyageId === undefined ? undefined : voyageBoard(VoyageId.make(context.voyageId));
};

const withBoard = <R>(context: ToolContext, scope: "self" | "piece" | "voyage", act: (board: BoardId) => Effect.Effect<ToolAnswer, never, R>) => {
	const board = boardOf(context, scope);
	return board === undefined ? Effect.succeed(refused(`you have no ${scope} board`)) : act(board);
};

const lines = (entries: readonly Entry[]) =>
	entries.map((entry) => `[${entry.kind === "summary" ? `summary ${entry.id}` : entry.register}] ${entry.body}`).join("\n");
const first = <A, E, R>(stream: Stream.Stream<A, E, R>) => Stream.runHead(stream).pipe(Effect.map(Option.getOrThrow));

export const readBoardTool = bind(readBoardSpec, (context, input) =>
	withBoard(context, input.scope, (board) =>
		answered(
			context,
			readBoardSpec.name,
			Effect.flatMap(Live, (live) =>
				first(input.summaryId === undefined ? live.live(digest, { board }) : live.live(under, { board, summaryId: input.summaryId })),
			),
			(entries) => {
				if (entries.length > 0) return lines(entries);
				return input.summaryId === undefined ? "the board is empty" : "no notes stand behind that summary";
			},
		),
	),
);

export const writeBoardTool = bind(writeBoardSpec, (context, input) =>
	withBoard(context, input.scope, (board) =>
		answered(
			context,
			writeBoardSpec.name,
			Effect.flatMap(Commit, (commit) =>
				commit
					.commit(write, { author: context.agentId, board, body: input.body, register: "rough", requestId: requestId(context) })
					.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq))),
			),
			() => `written to the ${input.scope} board`,
		),
	),
);

export const readMailTool = bind(readMailSpec, (context) =>
	answered(
		context,
		readMailSpec.name,
		Effect.flatMap(Live, (live) => first(live.live(unread, { agentId: context.agentId }))),
		(held) => (held.length === 0 ? "No mail." : held.map((mail) => `${mail.id} [${mail.precedence}] ${mail.sentAt} — ${mail.body}`).join("\n")),
	),
);

export const markReadTool = bind(markReadSpec, (context, input) =>
	answered(
		context,
		markReadSpec.name,
		Effect.flatMap(Commit, (commit) =>
			commit
				.commit(markRead, { agentId: context.agentId, ids: input.entryIds.map((id) => MessageId.make(id)), requestId: requestId(context) })
				.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq))),
		),
		() => "marked read",
	),
);

export const boardTools = [readMailTool, markReadTool, writeBoardTool, readBoardTool];
