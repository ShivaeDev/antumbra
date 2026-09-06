import type {
	RulingContextView,
	RulingGatedPieceView,
	RulingReclassificationView,
	RulingRequesterView,
	RulingView,
	RulingVoyageView,
	StandingRulingView,
} from "@antumbra/contract";
import type { Ruling, RulingAnswer, RulingContext, RulingReclassification } from "@antumbra/rulings";
import { Option } from "effect";
import { agentSeen, type RulingNames, speakerSeen, subjectSeen } from "#ruling-names.ts";
import { type RungRows, rungSeen } from "#ruling-rung-view.ts";

type RulingWorld = RungRows & { readonly names: RulingNames; readonly gatedPieces: ReadonlyArray<RulingGatedPieceView> };

const reclassificationSeen = (world: RulingNames, reclassification: RulingReclassification): RulingReclassificationView => ({
	at: reclassification.at.toISOString(),
	by: reclassification.by,
	byAgent: speakerSeen(world, reclassification.byAgentId),
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

const contextSeen = (world: RulingNames, context: RulingContext): RulingContextView => ({
	at: context.at.toISOString(),
	author: speakerSeen(world, context.authorAgentId),
	body: context.body,
});

const requesterSeen = (world: RulingNames, requester: Ruling["requester"]): RulingRequesterView =>
	requester.kind === "agent" ? { agent: agentSeen(world, requester.agentId), kind: "agent" } : requester;

const voyageSeen = (ruling: Ruling, world: Pick<RungRows, "voyages">): RulingVoyageView | null => {
	const named = new Set(ruling.subjects.flatMap((subject) => (subject.kind === "voyage" ? [subject.id] : [])));
	const voyage = world.voyages.find((row) => named.has(row.id));
	return voyage === undefined ? null : { id: voyage.id, name: voyage.name };
};

export const rulingSeen = (ruling: Ruling, world: RulingWorld): RulingView => ({
	choices: ruling.choices.map((choice) => ({
		detail: choice.detail,
		id: choice.id,
		label: choice.label,
	})),
	context: ruling.context,
	contexts: ruling.contexts.map((context) => contextSeen(world.names, context)),
	declared: ruling.declared,
	gatedPieces: world.gatedPieces.filter((piece) => ruling.gatedPieceIds.includes(piece.pieceId)),
	id: ruling.id,
	parked: Option.getOrNull(Option.map(ruling.parked, (parked) => ({ at: parked.at.toISOString(), note: parked.note }))),
	question: ruling.question,
	radius: ruling.radius,
	reclassifications: ruling.reclassifications.map((move) => reclassificationSeen(world.names, move)),
	recommendation: Option.getOrNull(ruling.recommendation),
	requestedAt: ruling.createdAt.toISOString(),
	requester: requesterSeen(world.names, ruling.requester),
	rung: rungSeen(ruling, world),
	subjects: ruling.subjects.map((subject) => subjectSeen(world.names, subject)),
	urgency: ruling.urgency,
	voyage: voyageSeen(ruling, world),
});

const chosenLabel = (ruling: Ruling, answer: RulingAnswer): string | null =>
	Option.getOrNull(
		Option.flatMap(answer.choiceId, (choiceId) =>
			Option.map(Option.fromUndefinedOr(ruling.choices.find((choice) => choice.id === choiceId)), (choice) => choice.label),
		),
	);

export const standingRulingSeen = (world: RulingNames, ruling: Ruling, answer: RulingAnswer, stale: boolean): StandingRulingView => ({
	answer: answer.text,
	chosen: chosenLabel(ruling, answer),
	id: ruling.id,
	question: ruling.question,
	radius: ruling.radius,
	ruledAt: answer.at.toISOString(),
	ruledBy: answer.by,
	ruledByAgent: speakerSeen(world, answer.byAgentId),
	stale,
	subjects: ruling.subjects.map((subject) => subjectSeen(world, subject)),
	urgency: ruling.urgency,
});
