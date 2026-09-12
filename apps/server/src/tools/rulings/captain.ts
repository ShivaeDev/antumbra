import { answer } from "@antumbra/domain-rulings/commands/answer.ts";
import { passUp } from "@antumbra/domain-rulings/commands/pass-up.ts";
import { reclassify } from "@antumbra/domain-rulings/commands/reclassify.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { authorityFor, readRuling, replayed } from "#tools/rulings/runtime.ts";
import { passUpSpec, reclassifyRulingSpec, ruleOnSpec } from "#tools/rulings/verdicts.ts";

const verdict = bind(ruleOnSpec, (context, input) =>
	answered(
		context,
		ruleOnSpec.name,
		Effect.gen(function* () {
			const commit = yield* Commit;
			const rulingId = RulingId.make(input.rulingId);
			const ruling = yield* readRuling(rulingId);
			const authority = yield* authorityFor(context);
			const choice = ruling.choices.find((choice) => choice.label === input.choice);
			if (input.choice !== undefined && choice === undefined)
				return yield* Effect.fail(`ruling ${ruling.id} never offered the choice "${input.choice}"`);
			yield* replayed(
				commit.commit(answer, {
					requestId: requestId(context),
					rulingId,
					answer: input.answer,
					choiceId: choice?.id ?? null,
					by: authority.by,
					byAgentId: context.agentId,
				}),
			);
			return `ruling ${rulingId} ruled — it binds ${ruling.radius} until the admiral supersedes it, and the answer reaches the asker as mail`;
		}),
		(text) => text,
	),
);
const pass = bind(passUpSpec, (context, input) =>
	answered(
		context,
		passUpSpec.name,
		Effect.gen(function* () {
			const commit = yield* Commit;
			const authority = yield* authorityFor(context);
			yield* replayed(
				commit.commit(passUp, {
					requestId: requestId(context),
					rulingId: RulingId.make(input.rulingId),
					note: input.note,
					by: authority.by,
					byAgentId: context.agentId,
				}),
			);
			return `ruling ${input.rulingId} passed up — it waits on the rung above you now, with your note beside the asker's own words`;
		}),
		(text) => text,
	),
);
const move = bind(reclassifyRulingSpec, (context, input) =>
	answered(
		context,
		reclassifyRulingSpec.name,
		Effect.gen(function* () {
			const commit = yield* Commit;
			const authority = yield* authorityFor(context);
			const rulingId = RulingId.make(input.rulingId);
			yield* replayed(
				commit.commit(reclassify, {
					requestId: requestId(context),
					rulingId,
					by: authority.by,
					byAgentId: context.agentId,
					radius: input.radius ?? null,
					urgency: input.urgency ?? null,
					note: input.note ?? null,
				}),
			);
			const ruling = yield* readRuling(rulingId);
			return `ruling ${rulingId} now reads ${ruling.radius} radius, ${ruling.urgency} — your word is appended beside what the asker declared`;
		}),
		(text) => text,
	),
);
export const captainRulingTools = [verdict, pass, move] as const;
