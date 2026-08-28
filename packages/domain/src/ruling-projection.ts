import type {
	RulingReclassificationView,
	RulingSubjectView,
	RulingView,
} from "@antumbra/contract";
import type {
	Ruling,
	RulingReclassification,
	RulingSubject,
} from "@antumbra/rulings";
import { Option } from "effect";

RulingGatedPieceView,
	RulingSubjectView,
	RulingView,
} from "@antumbra/contract"

import type { Ruling, RulingSubject } from "@antumbra/rulings";
import type { PieceRow, VoyageWorld } from "#voyage-rows.ts";

// why: a subject reaches the window as the word that named it — the id of the
// row it points at, or the tag itself when the concept has no row of its own.
const subjectSeen = (subject: RulingSubject): RulingSubjectView =>
	subject.kind === "tag"
		? { kind: subject.kind, label: subject.tag }
		: { kind: subject.kind, label: subject.id };

// why: an axis a reclassification left alone is absent from the view rather
// than carried as an empty value, so the window reads only what was moved.
const reclassificationSeen = (
	reclassification: RulingReclassification,
): RulingReclassificationView => ({
	at: reclassification.at.toISOString(),
	by: reclassification.by,
	...Option.match(reclassification.note, {
		onNone: () => ({}),
		onSome: (note) => ({ note }),
	}),
	...Option.match(reclassification.radius, {
		onNone: () => ({}),
		onSome: (radius) => ({ radius }),
	}),
	...Option.match(reclassification.urgency, {
		onNone: () => ({}),
		onSome: (urgency) => ({ urgency }),
	}),
});

export const rulingSeen = (ruling: Ruling): RulingView => ({
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
	declared: ruling.declared,
	gatedPieces: gatedPiecesSeen(world, ruling.gatedPieceIds),
	id: ruling.id,
	question: ruling.question,
	radius: ruling.radius,
	reclassifications: ruling.reclassifications.map(reclassificationSeen),
	requestedAt: ruling.createdAt.toISOString(),
	requesterAgentId: ruling.requesterAgentId,
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});
