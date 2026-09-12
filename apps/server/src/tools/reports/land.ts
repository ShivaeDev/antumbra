import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { land } from "@antumbra/domain-reports/commands/land.ts";
import { answered, onPiece } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind, defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-tool-schemas/request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect, Schema } from "effect";

export const landReportSpec = defineTool({
	description: "Record findings or completed work as a Report for other agents, attached to your Piece.",
	input: Schema.Struct({
		body: land.input.body.annotate({ description: "The report itself, written for the agent who reads it next." }),
		title: land.input.title.annotate({ description: "One line naming what this report says." }),
	}),
	name: "land_report",
});

export const landReportTool = bind(landReportSpec, (context, input) =>
	onPiece(context, (pieceId) =>
		Effect.gen(function* () {
			const commit = yield* Commit;
			return yield* answered(
				context,
				landReportSpec.name,
				commit
					.commit(land, {
						authorAgentId: context.agentId,
						body: input.body,
						title: input.title,
						pieceId: PieceId.make(pieceId),
						requestId: requestId(context),
					})
					.pipe(Effect.catchTag("AlreadyDone", (already) => Effect.succeed(already.seq))),
				() => "report landed",
			);
		}),
	),
);
