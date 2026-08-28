import type { RulingSubjectView, RulingView } from "@antumbra/contract";
import type { Ruling, RulingSubject } from "@antumbra/rulings";

// why: a subject reaches the window as the word that named it — the id of the
// row it points at, or the tag itself when the concept has no row of its own.
const subjectSeen = (subject: RulingSubject): RulingSubjectView =>
	subject.kind === "tag"
		? { kind: subject.kind, label: subject.tag }
		: { kind: subject.kind, label: subject.id };

export const rulingSeen = (ruling: Ruling): RulingView => ({
	choices: ruling.choices.map((choice) => ({
		detail: choice.detail,
		id: choice.id,
		label: choice.label,
	})),
	context: ruling.context,
	id: ruling.id,
	question: ruling.question,
	radius: ruling.radius,
	requestedAt: ruling.createdAt.toISOString(),
	requesterAgentId: ruling.requesterAgentId,
	subjects: ruling.subjects.map(subjectSeen),
	urgency: ruling.urgency,
});
