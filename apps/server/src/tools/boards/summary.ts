import { finishSmoothingSession } from "@antumbra/domain-boards/commands/finish-smoothing-session.ts";
import { summarize } from "@antumbra/domain-boards/commands/summarize.ts";
import { summarizePiece } from "@antumbra/domain-boards/commands/summarize-piece.ts";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { smoothingSessionFor } from "@antumbra/domain-boards/queries/smoothing-session-for.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { writeSummarySpec } from "#tools/boards/specs.ts";

export const writeSummaryTool = bind(writeSummarySpec, (context, { text }) =>
	answered(
		context,
		writeSummarySpec.name,
		Effect.gen(function* () {
			const live = yield* Live;
			const commit = yield* Commit;
			const target = yield* live.read(smoothingSessionFor, { sessionId: context.sessionId });
			if (target === null || target.agentId !== context.agentId) return yield* Effect.fail("this session has no summary to write");
			const answer = { ok: true, text: text.trim() === "" ? "the summary was empty" : "summary written" };
			if (target.status !== "waiting") return answer;
			if (text.trim() !== "") {
				yield* commit
					.commit(summarize, {
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
					yield* commit
						.commit(summarizePiece, {
							author: context.agentId,
							board: voyageBoard(target.voyageId),
							body: text,
							pieceId: target.pieceId,
							requestId: requestId(context, "voyage-piece-summary"),
						})
						.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			}
			yield* commit
				.commit(finishSmoothingSession, {
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
