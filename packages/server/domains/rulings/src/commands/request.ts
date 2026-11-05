import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { askedInput } from "#commands/inputs.ts";
import { rulingRequested } from "#facts/ruling-requested.ts";
import { Subject } from "#rows/ruling.ts";
export const subjectRows = [agent, piece, repo, voyage] as const;
export const request = command("request", {
	input: askedInput,
	reads: subjectRows,
	emits: rulingRequested,
	rejections: {
		SubjectMissing: { subject: Subject },
		PieceMissing: { pieceId: PieceId },
		RecommendationMissing: { choice: Schema.String, offered: Schema.Array(Schema.String) },
	},
});
