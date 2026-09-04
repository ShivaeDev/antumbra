import type { RulingReclassificationView, RulingSubjectView, RulingView, StandingRulingView } from "@antumbra/contract";
import type { Ruling, RulingAnswer, RulingReclassification, RulingSubject } from "@antumbra/rulings";
import { Option } from "effect";
import { approvedPiecesSeen } from "#ruling-approved-pieces.ts";
import { gatedPiecesSeen } from "#ruling-gated-pieces.ts";
import { rungSeen } from "#ruling-rung-view.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

const subjectSeen = (subject: RulingSubject): RulingSubjectView =>
	subject.kind === "tag" ? { kind: subject.kind, label: subject.tag } : { kind: subject.kind, label: subject.id };

const reclassificationSeen = (reclassification: RulingReclassification): RulingReclassificationView => ({
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
	approvedPieces: approvedPiecesSeen(world, ruling.approvedPieceIds),
	choices: ruling.choices.map((choice) => ({
		detail: choice.detail,
		id: choice.id,
		label: choice.label,
	})),
	context: ruling.context,
	declared: ruling.declared,
	gatedPieces: gatedPiecesSeen(world, ruling.gatedPieceIds),
	id: ruling.id,
	kind: ruling.kind,
	question: ruling.question,
	radius: ruling.radius,
	reclassifications: ruling.reclassifications.map(reclassificationSeen),
	requestedAt: ruling.createdAt.toISOString(),
	requester: ruling.requester,
	rung: rungSeen(ruling, world),
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});

const chosenLabel = (ruling: Ruling, answer: RulingAnswer): string | null =>
	Option.getOrNull(
		Option.flatMap(answer.choiceId, (choiceId) =>
			Option.map(Option.fromUndefinedOr(ruling.choices.find((choice) => choice.id === choiceId)), (choice) => choice.label),
		),
	);

export const standingRulingSeen = (ruling: Ruling, answer: RulingAnswer, stale: boolean): StandingRulingView => ({
	answer: answer.text,
	chosen: chosenLabel(ruling, answer),
	id: ruling.id,
	question: ruling.question,
	radius: ruling.radius,
	ruledAt: answer.at.toISOString(),
	ruledBy: answer.by,
	ruledByAgentId: Option.getOrNull(answer.byAgentId),
	stale,
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});
