import { type Ruling, type RulingAnswer, type RulingSubject, Rulings } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { ruledByWords } from "#ruling-words.ts";

// why: an agent is reached as the thing it is — a piece, a voyage, an identity
// — so the seams that open a context hand over what they know and nothing has
// to learn to read a session.
export interface RulingReader {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly voyageId: Option.Option<string>;
}

const subjectsOf = (reader: RulingReader, tags: ReadonlyArray<string>): ReadonlyArray<RulingSubject> => [
	{ id: reader.agentId, kind: "agent" },
	...Option.toArray(reader.pieceId).map((id): RulingSubject => ({ id, kind: "piece" })),
	...Option.toArray(reader.voyageId).map((id): RulingSubject => ({ id, kind: "voyage" })),
	...tags.map((tag): RulingSubject => ({ kind: "tag", tag })),
];

// why: a ruling binds an agent when it names what the agent is, and a fleet
// ruling binds everyone whether or not it names anything. The whole standing
// set is read once so the two answers come back in one order: newest first.
export const standingRulingsFor = Effect.fn("domain.standingRulingsFor")(function* (reader: RulingReader, tags: ReadonlyArray<string> = []) {
	const rulings = yield* Rulings;
	const named = yield* rulings.standing(subjectsOf(reader, tags));
	const ruled = yield* rulings.standing([]);
	const bound = new Set(named.map((ruling) => ruling.id));
	return ruled.filter((ruling) => ruling.radius === "fleet" || bound.has(ruling.id));
});

// why: radius decides how widely an answer applies, and a reader is told that
// in English rather than handed the word the record stores it under.
const REACH: Readonly<Record<Ruling["radius"], string>> = {
	fleet: "binds the whole fleet",
	piece: "binds one piece",
	voyage: "binds one voyage",
};

const chosen = (ruling: Ruling, answer: RulingAnswer): string => {
	const picked = Option.flatMap(answer.choiceId, (choiceId) => Option.fromUndefinedOr(ruling.choices.find((choice) => choice.id === choiceId)));
	return Option.match(picked, {
		onNone: () => "",
		onSome: (choice) => ` (chose: ${choice.label})`,
	});
};

// why: an authority that wants a standing rule asks and answers a ruling of
// its own, so a reader is told the rule was proclaimed rather than left to read
// it as an agent's question that happened to be answered.
const askedBy = (ruling: Ruling): string =>
	ruling.requester.kind === "authority" ? `proclaimed by the ${ruling.requester.by}` : `asked by ${ruling.requester.agentId}`;

// why: an answer is read in the light of its question, so who ruled and when
// travel with the words rather than being left for another lookup.
const verdictOf = (ruling: Ruling): string =>
	Option.match(ruling.answer, {
		onNone: () => "not ruled yet",
		onSome: (answer) => `${answer.text}${chosen(ruling, answer)} — ruled by ${ruledByWords(answer)} on ${answer.at.toISOString()}`,
	});

export const rulingLine = (ruling: Ruling): string =>
	`- ${ruling.id} (${REACH[ruling.radius]}, ${askedBy(ruling)}) ${ruling.question} — ${verdictOf(ruling)}`;

export const rulingBlock = (ruling: Ruling): string =>
	[
		`## ${ruling.id} — ${REACH[ruling.radius]}`,
		`Question: ${ruling.question}`,
		`Context: ${ruling.context}`,
		`Answer: ${verdictOf(ruling)}`,
		`This ruling was ${askedBy(ruling)}.`,
	].join("\n");
