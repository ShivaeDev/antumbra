import { bind, requestRulingSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import {
	type Ruling,
	type RulingChoiceInput,
	type RulingSubject,
	Rulings,
} from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the asker never names its own scope. Where the work sits is durable
// truth the session was opened with, so a ruling can never be filed against a
// piece or voyage the agent is not on, and the agent itself is always a
// subject: what binds it is readable from its own record afterwards.
const identitySubjects = (
	identity: SessionIdentity,
): ReadonlyArray<RulingSubject> => [
	...Option.match(identity.pieceId, {
		onNone: (): ReadonlyArray<RulingSubject> => [],
		onSome: (id): ReadonlyArray<RulingSubject> => [{ id, kind: "piece" }],
	}),
	...Option.match(identity.voyageId, {
		onNone: (): ReadonlyArray<RulingSubject> => [],
		onSome: (id): ReadonlyArray<RulingSubject> => [{ id, kind: "voyage" }],
	}),
	{ id: identity.agentId, kind: "agent" },
];

const subjectsOf = (
	identity: SessionIdentity,
	tags: ReadonlyArray<string> | undefined,
): ReadonlyArray<RulingSubject> => [
	...identitySubjects(identity),
	...(tags ?? []).map((tag): RulingSubject => ({ kind: "tag", tag })),
];

const choiceOf = (choice: {
	readonly detail?: string | undefined;
	readonly label: string;
}): RulingChoiceInput =>
	choice.detail === undefined
		? { label: choice.label }
		: { detail: choice.detail, label: choice.label };

const said = (ruling: Ruling): string =>
	`ruling ${ruling.id} requested — ${ruling.radius} radius, ${ruling.urgency}. The answer reaches you as mail; nothing here waits for it.`;

export const makeRulingToolCompiler = Effect.gen(function* () {
	const rulings = yield* Rulings;
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(requestRulingSpec, (input) =>
			answered(
				identity,
				requestRulingSpec.name,
				rulings.request({
					choices: (input.choices ?? []).map(choiceOf),
					context: input.context,
					question: input.question,
					radius: input.radius,
					requesterAgentId: identity.agentId,
					subjects: subjectsOf(identity, input.tags),
					urgency: input.urgency,
				}),
				said,
			),
		),
	];
});
