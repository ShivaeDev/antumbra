import { type Ruling, type RulingAnswer, type RulingSubject, Rulings } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { ruledByWords } from "#ruling-words.ts";

interface RulingReader {
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

export const standingRulingsFor = Effect.fn("domain.standingRulingsFor")(function* (reader: RulingReader, tags: ReadonlyArray<string> = []) {
	const rulings = yield* Rulings;
	const named = yield* rulings.standing(subjectsOf(reader, tags));
	const ruled = yield* rulings.standing([]);
	const bound = new Set(named.map((ruling) => ruling.id));
	return ruled.filter((ruling) => ruling.radius === "fleet" || bound.has(ruling.id));
});

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

const askedBy = (ruling: Ruling): string =>
	ruling.requester.kind === "authority" ? `proclaimed by the ${ruling.requester.by}` : `asked by ${ruling.requester.agentId}`;

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
