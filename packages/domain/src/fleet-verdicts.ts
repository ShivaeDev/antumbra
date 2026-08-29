import { bind, ruleOnSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { type Ruling, Rulings, type RulingVerdict } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { answered, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

type Asked = (typeof ruleOnSpec)["input"]["Type"];

const pickOf = (ruling: Ruling, label: string): Option.Option<string> =>
	Option.map(
		Option.fromUndefinedOr(
			ruling.choices.find((choice) => choice.label === label),
		),
		(choice) => choice.id,
	);

// why: the flagship answers at fleet radius and there is no rung above it to
// pass a wider question to, so the only ruling it must decline is a narrower
// one — and it is told whose that is rather than merely that it is not its.
const NARROWER: Readonly<Record<"piece" | "voyage", string>> = {
	piece: "one piece",
	voyage: "one voyage",
};

const notTheFleets = (ruling: Ruling, radius: "piece" | "voyage"): string =>
	`ruling ${ruling.id} binds ${NARROWER[radius]}, not the fleet — it is that voyage's captain's to rule on, and until captains sit on the ladder it waits for the admiral`;

const offeredLabels = (ruling: Ruling): string =>
	ruling.choices.length === 0
		? "it offered none"
		: `it offered ${ruling.choices.map((choice) => `"${choice.label}"`).join(", ")}`;

// why: every way a verdict cannot land is read off the ruling before anything
// is written, so the captain hears a sentence it can act on instead of the
// record's own refusal read back to it.
const refusalOf = (ruling: Ruling, asked: Asked): Option.Option<string> => {
	if (Option.isSome(ruling.answer)) {
		return Option.some(
			`ruling ${ruling.id} was already ruled by the ${ruling.answer.value.by} — a ruling that stands is superseded, never answered twice`,
		);
	}
	if (ruling.radius !== "fleet") {
		return Option.some(notTheFleets(ruling, ruling.radius));
	}
	const label = asked.choice;
	if (label !== undefined && Option.isNone(pickOf(ruling, label))) {
		return Option.some(
			`ruling ${ruling.id} never offered the choice "${label}" — ${offeredLabels(ruling)}`,
		);
	}
	return Option.none();
};

// why: a pick is named by the label the asker wrote, because the choice ids
// belong to the record and never reach the mail the captain read.
const verdictOf = (ruling: Ruling, asked: Asked): RulingVerdict => {
	const picked =
		asked.choice === undefined
			? Option.none<string>()
			: pickOf(ruling, asked.choice);
	return Option.match(picked, {
		onNone: (): RulingVerdict => ({
			answer: asked.answer,
			by: "flagship",
			rulingId: ruling.id,
		}),
		onSome: (choiceId): RulingVerdict => ({
			answer: asked.answer,
			by: "flagship",
			choiceId,
			rulingId: ruling.id,
		}),
	});
};

const ruled = (ruling: Ruling): string =>
	`ruling ${ruling.id} ruled by the flagship — it binds the whole fleet until the admiral supersedes it, and the answer reaches the asker as mail`;

// why: the verdict the flagship gives on a request that climbed to it. The
// ruling is read first because the refusals are all facts about the ruling
// rather than about the words the captain wrote, and reading it is also how a
// choice named by its label becomes the id the record stores.
export const makeFleetVerdictToolCompiler = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const settle = (identity: SessionIdentity, asked: Asked) =>
		Effect.gen(function* () {
			const ruling = yield* rulings.get(asked.rulingId);
			const refusal = refusalOf(ruling, asked);
			return Option.isSome(refusal)
				? refused(refusal.value)
				: yield* answered(
						identity,
						ruleOnSpec.name,
						rulings.rule(verdictOf(ruling, asked)),
						ruled,
					);
		}).pipe(
			Effect.catchTag("RulingNotFound", () =>
				Effect.succeed(
					refused(
						`there is no ruling ${asked.rulingId} — name it as your mail does`,
					),
				),
			),
			Effect.catch((cause) =>
				Effect.succeed(refused(`${ruleOnSpec.name}: ${cause}`)),
			),
		);
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(ruleOnSpec, (asked) => settle(identity, asked)),
	];
});
