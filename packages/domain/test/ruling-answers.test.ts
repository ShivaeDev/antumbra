import { BoardScope, Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import type { DirectTool } from "@antumbra/plugin-api";
import { Rulings } from "@antumbra/rulings";
import { RulingHolds } from "@antumbra/rulings/holds/service";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { makeRulingReplies } from "#ruling-replies.ts";
import { compileRulingTools } from "#ruling-tools.ts";
import { ASKER, seedAsker } from "#test/ruling-fixtures.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const MATE = "agent-mate";

const seedMate = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "sound the eastern shoal",
		currentSessionId: null,
		id: MATE,
		role: "hand",
		status: "dormant",
	});
});

const toolNamed = (tools: ReadonlyArray<DirectTool>, name: string): DirectTool =>
	Option.getOrThrow(Option.fromUndefinedOr(tools.find((tool) => tool.name === name)));

const calling = (agentId: string, name: string, input: Record<string, unknown>) =>
	Effect.gen(function* () {
		const tools = yield* compileRulingTools({
			agentId,
			pieceId: Option.none(),
			sessionId: `session-${agentId}`,
			voyageId: Option.none(),
		});
		return yield* toolNamed(tools, name).call(input);
	});

const ask = (urgency: "blocking" | "pressing") =>
	calling(ASKER, "request_ruling", {
		choices: [{ label: "resurvey" }],
		context: "the chart disagrees with what we sounded",
		question: "which reading do we trust?",
		radius: "voyage",
		recommendation: { choice: "resurvey", reasoning: "a fresh sounding settles it either way" },
		urgency,
	});

const requested = (urgency: string) =>
	eventually(
		Effect.gen(function* () {
			const db = yield* Database;
			const row = (yield* db.Ruling.where({ urgency }).all())[0];
			return row === undefined ? yield* Effect.fail("not asked yet") : row;
		}),
	);

const holding = (rulingId: string) =>
	eventually(
		Effect.gen(function* () {
			const holds = yield* RulingHolds;
			return (yield* holds.isHeld(rulingId)) ? true : yield* Effect.fail("not holding yet");
		}),
	);

const ruleOn = (rulingId: string) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		return yield* rulings.rule({
			answer: "the chart is older than the reef; resurvey it",
			by: "admiral",
			rulingId,
		});
	});

const mailbox = Effect.gen(function* () {
	const boards = yield* Boards;
	return yield* boards.read(BoardScope.Agent({ agentId: ASKER }));
});

const stored = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return Option.getOrThrow(yield* db.Ruling.where({ id: rulingId }).first());
	});

it.effectApp("a question back ends the hold without answering the request", { clock: "live" }, function* () {
	yield* seedAsker;
	const replies = yield* makeRulingReplies;
	const held = yield* Effect.forkChild(ask("blocking"));
	const row = yield* requested("blocking");
	yield* holding(row.id);

	yield* replies.askMore({
		note: "which chart edition are you reading?",
		rulingId: row.id,
	});
	const outcome = yield* Fiber.join(held);

	expect(outcome.text).toContain("The admiral asks about your request, and has not ruled: which chart edition are you reading?");
	expect(outcome.text).toContain("Answer with add_context");
	expect(yield* stored(row.id)).toMatchObject({ answer: null, ruledAt: null });
	expect(yield* mailbox).toEqual([]);
});

it.effectApp("answering the question holds again until the verdict lands", { clock: "live" }, function* () {
	yield* seedAsker;
	const replies = yield* makeRulingReplies;
	const held = yield* Effect.forkChild(ask("blocking"));
	const row = yield* requested("blocking");
	yield* holding(row.id);
	yield* replies.askMore({ note: "which chart edition?", rulingId: row.id });
	yield* Fiber.join(held);

	const answering = yield* Effect.forkChild(
		calling(ASKER, "add_context", {
			context: "the 2019 edition",
			rulingId: row.id,
		}),
	);
	yield* holding(row.id);
	expect(answering.pollUnsafe()).toBeUndefined();

	yield* ruleOn(row.id);
	const outcome = yield* Fiber.join(answering);

	expect(outcome.text).toContain("your hold is over");
	expect(outcome.text).toContain("the chart is older than the reef; resurvey it");
});

it.effectApp("context from another agent lands at once and leaves the asker holding", { clock: "live" }, function* () {
	yield* seedAsker;
	yield* seedMate;
	const held = yield* Effect.forkChild(ask("blocking"));
	const row = yield* requested("blocking");
	yield* holding(row.id);

	const added = yield* calling(MATE, "add_context", {
		context: "we sounded the same shoal last week",
		rulingId: row.id,
	});

	expect(added).toMatchObject({ ok: true });
	expect(added.text).toContain(`context added to ruling ${row.id}`);
	expect(held.pollUnsafe()).toBeUndefined();

	yield* ruleOn(row.id);
	expect((yield* Fiber.join(held)).text).toContain("your hold is over");
});

it.effectApp("not now ends the hold and the request comes back when it is ruled", { clock: "live" }, function* () {
	yield* seedAsker;
	const replies = yield* makeRulingReplies;
	const held = yield* Effect.forkChild(ask("blocking"));
	const row = yield* requested("blocking");
	yield* holding(row.id);

	yield* replies.park({ note: "the survey lands first", rulingId: row.id });
	const outcome = yield* Fiber.join(held);

	expect(outcome.text).toContain("Not now: the survey lands first");
	expect(outcome.text).toContain("Work on what does not need the answer");
	expect(yield* stored(row.id)).toMatchObject({ ruledAt: null });
	expect((yield* stored(row.id)).parkedAt).toBeInstanceOf(Date);
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
});

it.effectApp("both answers reach an asker who is not holding", { clock: "live" }, function* () {
	yield* seedAsker;
	const replies = yield* makeRulingReplies;
	yield* ask("pressing");
	const row = yield* requested("pressing");

	yield* replies.askMore({
		note: "which chart edition are you reading?",
		rulingId: row.id,
	});
	yield* replies.park({ note: "the survey lands first", rulingId: row.id });

	const entries = yield* mailbox;
	expect(entries).toHaveLength(2);
	expect(entries[0]).toMatchObject({
		body: expect.stringContaining("The admiral asks about your request, and has not ruled: which chart edition are you reading?"),
		precedence: "priority",
	});
	expect(entries[1]).toMatchObject({
		body: expect.stringContaining("Not now: the survey lands first"),
		precedence: "priority",
		sourceRef: `ruling-parked:${row.id}`,
	});
});
