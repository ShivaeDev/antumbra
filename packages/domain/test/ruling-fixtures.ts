import { Database } from "@antumbra/persistence";
import {
	type RulingRequest,
	type RulingSubject,
	Rulings,
} from "@antumbra/rulings";
import { Effect } from "effect";

// why: a ruling is requested by an agent the record knows, so a rehearsal
// seeds one asker that takes no slot in the fleet before it asks anything.
const ASKER = "agent-asker";

export const seedAsker = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "ask what the chart cannot answer",
		currentSessionId: null,
		id: ASKER,
		role: "hand",
		status: "dormant",
	});
});

const ask = (
	question: string,
	scope: Pick<RulingRequest, "radius" | "subjects">,
) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		return yield* rulings.request({
			choices: [],
			context: `context of: ${question}`,
			question,
			requesterAgentId: ASKER,
			urgency: "pressing",
			...scope,
		});
	});

export const ruled = (
	question: string,
	answer: string,
	scope: Pick<RulingRequest, "radius" | "subjects">,
) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const asked = yield* ask(question, scope);
		return yield* rulings.rule({ answer, by: "admiral", rulingId: asked.id });
	});

export const unruled = ask;

export const onPiece = (pieceId: string): ReadonlyArray<RulingSubject> => [
	{ id: pieceId, kind: "piece" },
];

export const onVoyage = (voyageId: string): ReadonlyArray<RulingSubject> => [
	{ id: voyageId, kind: "voyage" },
];
