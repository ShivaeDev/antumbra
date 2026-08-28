import { bind, requestRulingSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import {
	type Ruling,
	type RulingChoiceInput,
	type RulingRequest,
	type RulingSubject,
	Rulings,
} from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { heldSaid, makeRulingHold } from "#ruling-hold.ts";
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

type Ask = (typeof requestRulingSpec)["input"]["Type"];

const requestOf = (identity: SessionIdentity, input: Ask): RulingRequest => ({
	choices: (input.choices ?? []).map(choiceOf),
	context: input.context,
	question: input.question,
	radius: input.radius,
	requesterAgentId: identity.agentId,
	subjects: subjectsOf(identity, input.tags),
	urgency: input.urgency,
});

// why: urgency decides whether the asker holds. A blocking call is the answer's
// own road back and returns only when the ruling lands; every other urgency
// returns at once and hears the answer as mail.
export const makeRulingToolCompiler = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const hold = yield* makeRulingHold;
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(requestRulingSpec, (input) => {
			const request = requestOf(identity, input);
			return request.urgency === "blocking"
				? answered(identity, requestRulingSpec.name, hold(request), heldSaid)
				: answered(
						identity,
						requestRulingSpec.name,
						rulings.request(request),
						said,
					);
		}),
	];
});
