import { bind, ruleOnSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { type Ruling, Rulings, type RulingVerdict } from "@antumbra/rulings";
import { bindsWords } from "@antumbra/rulings/radius/words";
import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect, Option } from "effect";
import { makeRulingSpeaker } from "#ruling-speaker.ts";
import { pickOf, verdictRefusal } from "#ruling-verdict-refusals.ts";
import { answered, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

type Asked = (typeof ruleOnSpec)["input"]["Type"];

const verdictOf = (ruling: Ruling, by: RulingAuthority, identity: SessionIdentity, asked: Asked): RulingVerdict => {
	const given = {
		answer: asked.answer,
		by,
		byAgentId: identity.agentId,
		rulingId: ruling.id,
	};
	const picked = asked.choice === undefined ? Option.none<string>() : pickOf(ruling, asked.choice);
	return Option.match(picked, {
		onNone: (): RulingVerdict => given,
		onSome: (choiceId): RulingVerdict => ({ ...given, choiceId }),
	});
};

const ruled = (ruling: Ruling): string =>
	`ruling ${ruling.id} ruled — it binds ${bindsWords[ruling.radius]} until the admiral supersedes it, and the answer reaches the asker as mail`;

export const makeCaptainVerdictToolCompiler = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const speaksAs = yield* makeRulingSpeaker;
	const settle = (identity: SessionIdentity, asked: Asked) =>
		Effect.gen(function* () {
			const by = yield* speaksAs(identity);
			const ruling = yield* rulings.get(asked.rulingId);
			const refusal = verdictRefusal(ruling, by, asked);
			return Option.isSome(refusal)
				? refused(refusal.value)
				: yield* answered(identity, ruleOnSpec.name, rulings.rule(verdictOf(ruling, by, identity, asked)), ruled);
		}).pipe(
			Effect.catchTag("RulingNotFound", () => Effect.succeed(refused(`there is no ruling ${asked.rulingId} — name it as your mail does`))),
			Effect.catch((cause) => Effect.succeed(refused(`${ruleOnSpec.name}: ${cause}`))),
		);
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [bind(ruleOnSpec, (asked) => settle(identity, asked))];
});
