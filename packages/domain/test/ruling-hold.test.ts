import { BoardScope, Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import type { DirectTool } from "@antumbra/plugin-api";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Exit, Fiber, Option } from "effect";
import { makeRulingToolCompiler } from "#ruling-tools.ts";
import { ASKER, seedAsker } from "#test/ruling-fixtures.ts";
import { it } from "#test/runtime-harness.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const ASK = {
	choices: [{ label: "resurvey" }],
	context: "the chart disagrees with what we sounded",
	question: "which reading do we trust?",
	radius: "voyage",
	recommendation: { choice: "resurvey", reasoning: "a fresh sounding settles it either way" },
};

const rulingTool = (tools: ReadonlyArray<DirectTool>): DirectTool =>
	Option.getOrThrow(Option.fromUndefinedOr(tools.find((tool) => tool.name === "request_ruling")));

const ask = (urgency: "blocking" | "pressing") =>
	Effect.gen(function* () {
		const compile = yield* makeRulingToolCompiler;
		const tools = compile({
			agentId: ASKER,
			pieceId: Option.none(),
			sessionId: "session-asker",
			voyageId: Option.none(),
		});
		return yield* rulingTool(tools).call({ ...ASK, urgency });
	});

const requested = (urgency: string) =>
	eventually(
		Effect.gen(function* () {
			const db = yield* Database;
			const row = (yield* db.Ruling.where({ urgency }).all())[0];
			return row === undefined ? yield* Effect.fail("not asked yet") : row;
		}),
	);

const ruleOn = (rulingId: string) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const asked = yield* rulings.get(rulingId);
		return yield* rulings.rule({
			answer: "the chart is older than the reef; resurvey it",
			by: "admiral",
			choiceId: asked.choices[0]?.id ?? "",
			rulingId,
		});
	});

const mailbox = Effect.gen(function* () {
	const boards = yield* Boards;
	return yield* boards.read(BoardScope.Agent({ agentId: ASKER }));
});

it.effectApp("a blocking request holds until ruled and returns the answer", { clock: "live" }, function* () {
	yield* seedAsker;
	const held = yield* Effect.forkChild(ask("blocking"));
	const row = yield* requested("blocking");

	const pressing = yield* ask("pressing");
	expect(pressing).toMatchObject({ ok: true });
	expect(pressing.text).toContain("nothing here waits for it");
	expect(held.pollUnsafe()).toBeUndefined();

	const ruled = yield* ruleOn(row.id);
	const outcome = yield* Fiber.join(held);

	expect(outcome).toEqual({
		ok: true,
		text: [
			"Ruled — your hold is over.",
			"You asked: which reading do we trust?",
			"Answer: the chart is older than the reef; resurvey it",
			"Chosen: resurvey",
			`Ruled by the admiral at ${Option.getOrThrow(ruled.answer).at.toISOString()}.`,
			`Ruling ${row.id}.`,
		].join("\n"),
	});
});

it.effectApp("an interrupted hold leaves the ruling open for mail to answer", { clock: "live" }, function* () {
	const db = yield* Database;
	yield* seedAsker;
	const held = yield* Effect.forkChild(ask("blocking"));
	const row = yield* requested("blocking");

	yield* Fiber.interrupt(held);

	expect(Exit.hasInterrupts(yield* Fiber.await(held))).toBe(true);
	const open = Option.getOrThrow(yield* db.Ruling.where({ id: row.id }).first());
	expect(open).toMatchObject({ answer: null, ruledAt: null });
	expect(yield* mailbox).toEqual([]);

	yield* ruleOn(row.id);

	const entries = yield* eventually(
		Effect.gen(function* () {
			const read = yield* mailbox;
			expect(read).toHaveLength(1);
			return read;
		}),
	);
	expect(entries[0]?.sourceRef).toBe(`ruling:${row.id}`);
	const delivered = Option.getOrThrow(yield* db.Ruling.where({ id: row.id }).first());
	expect(delivered.deliveredAt).toBeInstanceOf(Date);
});

it.effectApp("a live hold owns the answer and no mail repeats it", { clock: "live" }, function* () {
	const db = yield* Database;
	yield* seedAsker;
	const held = yield* Effect.forkChild(ask("blocking"));
	const blocking = yield* requested("blocking");

	yield* ruleOn(blocking.id);
	const outcome = yield* Fiber.join(held);
	expect(outcome.text).toContain("your hold is over");
	const answered = Option.getOrThrow(yield* db.Ruling.where({ id: blocking.id }).first());
	expect(answered.deliveredAt).toBeInstanceOf(Date);

	yield* ask("pressing");
	const unheld = yield* requested("pressing");
	yield* ruleOn(unheld.id);

	const entries = yield* eventually(
		Effect.gen(function* () {
			const read = yield* mailbox;
			expect(read).toHaveLength(1);
			return read;
		}),
	);
	expect(entries[0]?.sourceRef).toBe(`ruling:${unheld.id}`);
});
