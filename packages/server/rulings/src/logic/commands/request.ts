import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import type * as Source from "@antumbra/domain-rulings/commands/request.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import type { Subject } from "@antumbra/domain-rulings/rows/ruling.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const subjectRows = [agent, piece, repo, voyage] as const;
export const missingSubject = Effect.fn("rulings.missingSubject")(function* (subjects: readonly (typeof Subject.Type)[]) {
	const rows = yield* Records;

	for (const subject of subjects) {
		if (subject.kind === "tag") continue;
		const references = {
			agent: rows.agent.count({ where: { id: AgentId.make(subject.id) } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			),
			piece: rows.piece.count({ where: { id: PieceId.make(subject.id) } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			),
			repo: rows.repo.count({ where: { id: RepoId.make(subject.id) } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			),
			voyage: rows.voyage.count({ where: { id: VoyageId.make(subject.id) } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			),
		};
		const present = yield* references[subject.kind];
		if (!present) return subject;
	}
	return null;
});
export const request = Effect.fn("rulings.request")(function* (
	input: typeof Source.request.Input.Type,
	reject: typeof Source.request.reject,
): Effect.fn.Return<typeof Source.request.emits.Payload.Type, RejectedBy<typeof Source.request.rejections>, Records> {
	const rows = yield* Records;

	const missing = yield* missingSubject(input.subjects);
	if (missing !== null) return yield* reject.SubjectMissing({ subject: missing });
	for (const pieceId of input.gates)
		if (
			!(yield* rows.piece.count({ where: { id: pieceId } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			))
		)
			return yield* reject.PieceMissing({ pieceId });
	const recommendation = input.recommendation;
	if (recommendation !== null && input.choices.length > 0 && !input.choices.some((choice) => choice.label === recommendation.choice))
		return yield* reject.RecommendationMissing({ choice: recommendation.choice, offered: input.choices.map((choice) => choice.label) });
	return { id: RulingId.make(input.requestId), ...input };
});
