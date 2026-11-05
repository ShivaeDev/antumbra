import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { voyageBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Boards } from "@antumbra/server-boards/service.ts";
import { Effect } from "effect";
import { writeSummarySpec } from "#tools/boards/specs.ts";

export const writeSummaryTool = bind(writeSummarySpec, (context, { text }) =>
	answered(
		context,
		writeSummarySpec.name,
		Effect.gen(function* () {
			const boardsService = yield* Boards;

			const target = yield* boardsService.smoothingSessionFor({ sessionId: context.sessionId }).pipe(Effect.orDie);
			if (target === null || target.agentId !== context.agentId) return yield* Effect.fail("this session has no summary to write");
			const answer = { ok: true, text: text.trim() === "" ? "the summary was empty" : "summary written" };
			if (target.status !== "waiting") return answer;
			if (text.trim() !== "") {
				yield* boardsService
					.summarize({
						author: context.agentId,
						board: target.board,
						body: text,
						coversFrom: target.coversFrom,
						coversTo: target.coversTo,
						level: target.level,
						requestId: requestId(context, "board-summary"),
					})
					.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
				if (target.pieceId !== null)
					yield* boardsService
						.summarizePiece({
							author: context.agentId,
							board: voyageBoard(target.voyageId),
							body: text,
							pieceId: target.pieceId,
							requestId: requestId(context, "voyage-piece-summary"),
						})
						.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			}
			yield* boardsService
				.finishSmoothingSession({
					sessionId: context.sessionId,
					status: text.trim() === "" ? "empty" : "written",
					requestId: requestId(context, "summary-finished"),
				})
				.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			return answer;
		}),
		(answer) => answer.text,
	),
);
