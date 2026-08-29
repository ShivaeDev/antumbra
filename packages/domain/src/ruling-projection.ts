import type {
	RulingReclassificationView,
	RulingSubjectView,
	RulingView,
	StandingRulingView,
} from "@antumbra/contract";
import type {
	Ruling,
	RulingAnswer,
	RulingReclassification,
	RulingSubject,
} from "@antumbra/rulings";
import { Option } from "effect";
import { gatedPiecesSeen } from "#ruling-gated-pieces.ts";
import { rungSeen } from "#ruling-rung-view.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

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
	byAgentId: Option.getOrNull(reclassification.byAgentId),
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
	requester: ruling.requester,
	rung: rungSeen(ruling, world),
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
	ruledByAgentId: Option.getOrNull(answer.byAgentId),
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});
