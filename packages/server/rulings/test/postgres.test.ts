import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Option } from "effect";
import { expect } from "vitest";

const ask = {
	requestId: Request.make("passage"),
	requester: { kind: "authority", by: "admiral" },
	rung: "admiral",
	question: "Which passage?",
	context: "The channel shifted",
	radius: "piece",
	urgency: "blocking",
	choices: [{ label: "North" }, { label: "South" }],
	subjects: [],
	gates: [],
	recommendation: { choice: "North", reasoning: "Deeper water" },
} as const;
const answer = {
	requestId: Request.make("answer"),
	rulingId: RulingId.make("passage"),
	answer: "North",
	choiceId: null,
	by: "admiral",
	byAgentId: null,
} as const;
postgresApp.it(
	"replays rulings and keeps question, authority and commit visibility",
	[],
	function* ({ journal, replayJournal, api, holdWrite, rollback, published, clearPublished, executionHistory, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.rulings.request(ask);
		yield* replayJournal(legacy);
		expect(yield* api["rulings.byId"]({ id: answer.rulingId })).toEqual(
			yield* answered(legacy.api.rulings.byId({ id: answer.rulingId }), "journal ruling"),
		);
		yield* clearPublished();
		const before = yield* executionHistory.read();
		expect(yield* Effect.flip(api["rulings.answer"]({ ...answer, by: "captain" }))).toMatchObject({ _tag: "BelowRung" });
		expect(yield* executionHistory.read()).toEqual(before);
		expect(yield* published()).toEqual([]);
		const held = yield* holdWrite(api["rulings.answer"](answer));
		expect(yield* api["rulings.open"]({})).toHaveLength(1);
		expect(yield* published()).toEqual([]);
		yield* held.commit();
		yield* legacy.api.rulings.answer(answer);
		expect(yield* api["rulings.byId"]({ id: answer.rulingId })).toEqual(
			yield* answered(legacy.api.rulings.byId({ id: answer.rulingId }), "answered journal ruling"),
		);
		expect(yield* published()).toEqual(expect.arrayContaining(["ruling", "rulingDisplay"]));
		yield* clearPublished();
		yield* rollback(api["rulings.withdraw"]({ requestId: Request.make("withdraw"), rulingId: answer.rulingId, by: "admiral", note: "Changed tide" }));
		expect(Option.getOrThrow(yield* api["rulings.byId"]({ id: answer.rulingId })).withdrawal).toBeNull();
		expect(yield* published()).toEqual([]);
		const record = yield* api["rulings.byId"]({ id: answer.rulingId });
		yield* rebuild();
		expect(yield* api["rulings.byId"]({ id: answer.rulingId })).toEqual(record);
	},
);
