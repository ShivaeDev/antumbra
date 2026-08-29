import type { ruleOnSpec } from "@antumbra/agent-tools";
import { answersAt, type Ruling, reachesRung } from "@antumbra/rulings";
import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Option } from "effect";
import { bindsWords, ruledByWords } from "#ruling-words.ts";

type Asked = (typeof ruleOnSpec)["input"]["Type"];

export const pickOf = (ruling: Ruling, label: string): Option.Option<string> =>
	Option.map(
		Option.fromUndefinedOr(
			ruling.choices.find((choice) => choice.label === label),
		),
		(choice) => choice.id,
	);

const offeredLabels = (ruling: Ruling): string =>
	ruling.choices.length === 0
		? "it offered none"
		: `it offered ${ruling.choices.map((choice) => `"${choice.label}"`).join(", ")}`;

// why: a question that climbed is no longer the rung below's, and a question
// wider than the rung may bind was never its. The two are different failures
// and the captain is told which, because one is answered by leaving it alone
// and the other by passing it up with what it knows.
const climbedPast = (ruling: Ruling, rung: RulingAuthority): string =>
	`ruling ${ruling.id} waits on the ${rung} now — it climbed past you, and only the rung it waits on may settle it`;

const tooWide = (ruling: Ruling, by: RulingAuthority): string =>
	`ruling ${ruling.id} would bind ${bindsWords[ruling.radius]}, wider than the ${by} may bind — pass_up carries it to the rung above with what you know`;

// why: every way a verdict cannot land is read off the ruling before anything
// is written, so the captain hears a sentence it can act on instead of the
// record's own refusal read back to it. The record refuses the same things
// again on the way in; this is the wording, not the rule.
export const verdictRefusal = (
	ruling: Ruling,
	by: RulingAuthority,
	asked: Asked,
): Option.Option<string> => {
	const answer = ruling.answer;
	if (Option.isSome(answer)) {
		return Option.some(
			`ruling ${ruling.id} was already ruled by ${ruledByWords(answer.value)} — a ruling that stands is superseded, never answered twice`,
		);
	}
	const rung = ruling.rung;
	if (Option.isSome(rung) && !reachesRung(by, rung.value)) {
		return Option.some(climbedPast(ruling, rung.value));
	}
	if (!answersAt(by, ruling.radius)) {
		return Option.some(tooWide(ruling, by));
	}
	const label = asked.choice;
	return label !== undefined && Option.isNone(pickOf(ruling, label))
		? Option.some(
				`ruling ${ruling.id} never offered the choice "${label}" — ${offeredLabels(ruling)}`,
			)
		: Option.none();
};
