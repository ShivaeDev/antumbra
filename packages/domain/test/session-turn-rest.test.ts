import { SightSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, PubSub } from "effect";
import { rawOf, type ScriptedSession } from "#test/harness.ts";
import {
	DEFAULT_IDLE_SIESTA_AFTER_MILLIS,
	delegates,
	finishes,
	HAND,
	idleBackend,
	openedNatively,
	passedAt,
	presenceOf,
	restingAt,
	sessionRow,
	spawned,
} from "#test/session-idle-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

const completes = (live: ScriptedSession) =>
	live.emit({
		durationMs: 1200,
		raw: rawOf("turn/completed"),
		status: "completed",
		type: "turn.completed",
	});

const speaks = (live: ScriptedSession) =>
	live.emit({
		raw: rawOf("agent/message"),
		role: "agent",
		text: "on it",
		type: "message",
	});

const siestaIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "session/siesta" }).all();
});

const journalKinds = Effect.gen(function* () {
	const db = yield* Database;
	const events = yield* db.SessionEvent.where({ sessionId: HAND.sessionId })
		.orderBy((event) => event.seq.asc())
		.all();
	return events.map((event) => event.kind);
});

it.effectApp.withProviders("a completed turn settles the session that was working", idleBackend, function* (_, scripted) {
	yield* spawned;
	const live = yield* openedNatively(scripted);
	expect((yield* sessionRow).executionStatus).toBe("active");
	expect((yield* presenceOf).presence).toBe("working");

	yield* endsTurn(scripted, HAND.sessionId);

	expect(yield* live.closed).toBe(false);
	const idle = yield* presenceOf;
	expect(idle.presence).toBe("idle");
	expect(idle.canSend).toBe(true);
	expect(idle.canInterrupt).toBe(false);
});

it.effectApp.withProviders("resting writes nothing to the journal beyond the turn that ended", idleBackend, function* (_, scripted) {
	yield* spawned;
	yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);
	expect(yield* journalKinds).toEqual(["session.opened", "turn.completed"]);
});

it.effectApp.withProviders("words after a completed turn put the session back to work", idleBackend, function* (_, scripted) {
	const sight = yield* SightSource;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);

	yield* sight.send(HAND.sessionId, "one more thing");
	expect((yield* sessionRow).executionStatus).toBe("active");
	expect((yield* presenceOf).presence).toBe("working");
	expect(yield* live.sent).toEqual([HAND.charter]);
	expect(yield* live.steered).toEqual(["one more thing"]);

	yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
	expect(yield* siestaIntents).toEqual([]);
	expect(yield* live.closed).toBe(false);
});

it.effectApp.withProviders("an ending overtaken by new words leaves the session working", idleBackend, function* (_, scripted) {
	const feeds = yield* DomainFeeds;
	const sight = yield* SightSource;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);

	yield* sight.send(HAND.sessionId, "one more thing");
	expect((yield* sessionRow).executionStatus).toBe("active");

	const events = yield* feeds.subscribeSessionEvents();
	yield* completes(live);
	yield* speaks(live);
	expect((yield* PubSub.take(events)).kind).toBe("turn.completed");
	expect((yield* PubSub.take(events)).kind).toBe("message");
	expect((yield* sessionRow).executionStatus).toBe("active");
	expect((yield* presenceOf).presence).toBe("working");

	yield* endsTurn(scripted, HAND.sessionId);
});

it.effectApp.withProviders("the tree still holds back rest after the root's turn ends", idleBackend, function* (_, scripted) {
	const kernel = yield* Kernel;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* delegates(live);
	yield* endsTurn(scripted, HAND.sessionId);
	yield* restingAt(false);

	yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
	expect(yield* siestaIntents).toEqual([]);
	expect(yield* live.closed).toBe(false);

	yield* finishes(live);
	yield* restingAt(true);
	yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
	const demanded = yield* siestaIntents;
	expect(demanded).toHaveLength(1);
	expect(yield* untilTerminal(kernel.changes(demanded[0]?.id ?? ""))).toBe("succeeded");
	expect(yield* live.closed).toBe(true);
});
