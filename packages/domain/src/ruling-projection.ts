import type {
	RulingGatedPieceView,
	RulingSubjectView,
	RulingView,
	StandingRulingView,
} from "@antumbra/contract";
import type { Ruling, RulingAnswer, RulingSubject } from "@antumbra/rulings";
import { Option } from "effect";
import type { PieceRow, VoyageWorld } from "#voyage-rows.ts";

// why: a subject reaches the window as the word that named it — the id of the
// row it points at, or the tag itself when the concept has no row of its own.
const subjectSeen = (subject: RulingSubject): RulingSubjectView =>
	subject.kind === "tag"
		? { kind: subject.kind, label: subject.tag }
		: { kind: subject.kind, label: subject.id };

const berthedIn = (
	world: VoyageWorld,
	piece: PieceRow,
): ReadonlyArray<RulingGatedPieceView> =>
	world.memberships
		.filter((membership) => membership.pieceId === piece.id)
		.map((membership) =>
			world.voyages.find((row) => row.id === membership.voyageId),
		)
		.filter((voyage) => voyage !== undefined)
		.map((voyage) => ({
			pieceId: piece.id,
			title: piece.title,
			voyageId: voyage.id,
			voyageName: voyage.name,
		}));

// why: a gated piece is named once per voyage it was chartered for, so the
// admiral reads what a ruling releases by the places the work is owed to.
const gatedPiecesSeen = (
	world: VoyageWorld,
	pieceIds: ReadonlyArray<string>,
): ReadonlyArray<RulingGatedPieceView> =>
	world.pieces
		.filter((piece) => pieceIds.includes(piece.id))
		.flatMap((piece) => berthedIn(world, piece));

export const rulingSeen = (ruling: Ruling, world: VoyageWorld): RulingView => ({
	choices: ruling.choices.map((choice) => ({
		detail: choice.detail,
		id: choice.id,
		label: choice.label,
	})),
	context: ruling.context,
	gatedPieces: gatedPiecesSeen(world, ruling.gatedPieceIds),
	id: ruling.id,
	question: ruling.question,
	radius: ruling.radius,
	requestedAt: ruling.createdAt.toISOString(),
	requesterAgentId: ruling.requesterAgentId,
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});

// why: a pick reaches the window as the words the asker offered, because a
// choice id means nothing once the question it belonged to is read as answered.
const chosenLabel = (ruling: Ruling, answer: RulingAnswer): string | null =>
	Option.getOrNull(
		Option.flatMap(answer.choiceId, (choiceId) =>
			Option.map(
				Option.fromUndefinedOr(
					ruling.choices.find((choice) => choice.id === choiceId),
				),
				(choice) => choice.label,
			),
		),
	);

export const standingRulingSeen = (
	ruling: Ruling,
	answer: RulingAnswer,
): StandingRulingView => ({
	answer: answer.text,
	chosen: chosenLabel(ruling, answer),
	id: ruling.id,
	question: ruling.question,
	radius: ruling.radius,
	ruledAt: answer.at.toISOString(),
	ruledBy: answer.by,
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});
