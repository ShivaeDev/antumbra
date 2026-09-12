import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { Effect, Schema } from "effect";
import { askedInput } from "#commands/inputs.ts";
import { rulingRequested } from "#facts/ruling-requested.ts";
import { RulingId } from "#ids.ts";
import { Subject } from "#rows/ruling.ts";
export const subjectRows = [agent, piece, repo, voyage] as const;
export const missingSubject = Effect.fn("rulings.missingSubject")(function* (
	subjects: readonly (typeof Subject.Type)[],
	rows: ReadHandles<typeof subjectRows>,
) {
	for (const subject of subjects) {
		if (subject.kind === "tag") continue;
		const references = {
			agent: rows.agent.exists(AgentId.make(subject.id)),
			piece: rows.piece.exists(PieceId.make(subject.id)),
			repo: rows.repo.exists(RepoId.make(subject.id)),
			voyage: rows.voyage.exists(VoyageId.make(subject.id)),
		};
		const present = yield* references[subject.kind];
		if (!present) return subject;
	}
	return null;
});
export const request = command("request", {
	input: askedInput,
	reads: subjectRows,
	emits: rulingRequested,
	rejections: {
		SubjectMissing: { subject: Subject },
		PieceMissing: { pieceId: PieceId },
		RecommendationMissing: { choice: Schema.String, offered: Schema.Array(Schema.String) },
	},
	run: Effect.fn("rulings.request")(function* (input, rows, reject) {
		const missing = yield* missingSubject(input.subjects, rows);
		if (missing !== null) return yield* reject.SubjectMissing({ subject: missing });
		for (const pieceId of input.gates) if (!(yield* rows.piece.exists(pieceId))) return yield* reject.PieceMissing({ pieceId });
		const recommendation = input.recommendation;
		if (recommendation !== null && input.choices.length > 0 && !input.choices.some((choice) => choice.label === recommendation.choice))
			return yield* reject.RecommendationMissing({ choice: recommendation.choice, offered: input.choices.map((choice) => choice.label) });
		return { id: RulingId.make(input.requestId), ...input };
	}),
});
