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
	choices: ruling.choices.map((choice) => ({
		detail: choice.detail,
		id: choice.id,
		label: choice.label,
	})),
	context: ruling.context,
	declared: ruling.declared,
	id: ruling.id,
	question: ruling.question,
	radius: ruling.radius,
	reclassifications: ruling.reclassifications.map(reclassificationSeen),
	requestedAt: ruling.createdAt.toISOString(),
	requesterAgentId: ruling.requesterAgentId,
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});
