import { charter } from "@antumbra/domain-pieces/commands/charter.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { onMembers } from "#tools/pieces/reach.ts";
import { charterPieceSpec } from "#tools/pieces/specs.ts";
import { notice } from "#tools/voyages/pace.ts";

export const charterPiece = bind(charterPieceSpec, (context, input) =>
	onMembers(context, input.dependsOn, true, (voyageId) =>
		answered(
			context,
			charterPieceSpec.name,
			Effect.gen(function* () {
				const commit = yield* Commit;
				const notes = yield* notice(voyageId);
				const request = requestId(context);
				yield* commit
					.commit(charter, { ...input, voyageId, requestId: request })
					.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
				return [`chartered ${PieceId.make(request)}`, ...notes].join("\n");
			}),
			(text) => text,
		),
	),
);
