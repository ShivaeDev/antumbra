import { SightSource } from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option, Stream } from "effect";
import { liveSession, note, spawnRequest } from "#test/sight-fixture.ts";

it.effectApp("spawn surfaces on the fleet feed once the agent lives", function* () {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	const settled = yield* sight.fleetFeed.pipe(
		Stream.filter((fleet) => fleet.agents.some((agent) => agent.id === receipt.agentId && agent.status === "alive" && agent.sessions.length > 0)),
		Stream.take(1),
		Stream.runCollect,
	);
	const agent = settled[0]?.agents.find((a) => a.id === receipt.agentId);
	expect(agent?.role).toBe("navigator");
	expect(agent?.sessions.map((session) => session.id)).toEqual([receipt.sessionId]);
	expect(agent?.sessions[0]?.backend).toBe("scripted");
	expect(settled[0]?.backends).toEqual(["scripted"]);
});

it.effectApp("the event feed rehydrates from the log then stays live, no dupes", function* ({ scripted }) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	const session = yield* liveSession(scripted, receipt.sessionId);
	const recorded = yield* sight
		.sessionEventFeed({ fromSeq: 0, sessionId: receipt.sessionId })
		.pipe(Stream.take(2), Stream.runCollect, Effect.forkChild);
	yield* session.emit(note(0));
	yield* session.emit(note(1));
	expect((yield* Fiber.join(recorded)).map((event) => event.seq)).toEqual([0, 1]);
	const rehydratedUnknown: StoredEvent = {
		kind: "future.event",
		payload: "future bytes {",
		seq: 2,
		sessionId: receipt.sessionId,
	};
	yield* db.SessionEvent.create(rehydratedUnknown);
	const rehydrated = yield* Deferred.make<void>();
	const collector = yield* sight.sessionEventFeed({ fromSeq: 0, sessionId: receipt.sessionId }).pipe(
		Stream.tap((event) => (event.seq === 2 ? Deferred.succeed(rehydrated, undefined) : Effect.void)),
		Stream.take(4),
		Stream.runCollect,
		Effect.forkChild,
	);
	yield* Deferred.await(rehydrated);
	const liveMismatch: StoredEvent = {
		kind: "thinking",
		payload: JSON.stringify(note(3)),
		seq: 3,
		sessionId: receipt.sessionId,
	};
	yield* db.SessionEvent.create(liveMismatch);
	yield* feeds.publishSessionEvent(liveMismatch);
	const events = yield* Fiber.join(collector);
	expect(events.map((event) => event.seq)).toEqual([0, 1, 2, 3]);
	expect(events.map((event) => event.event._tag)).toEqual(["Known", "Known", "Unknown", "Unknown"]);
	expect(events[2]?.event).toEqual({
		_tag: "Unknown",
		kind: "future.event",
		payload: "future bytes {",
	});
	expect(events[3]?.event).toEqual({
		_tag: "Unknown",
		kind: "thinking",
		payload: liveMismatch.payload,
	});
	const tail = yield* sight.sessionEventFeed({ fromSeq: 2, sessionId: receipt.sessionId }).pipe(Stream.take(1), Stream.runCollect);
	expect(tail.map((event) => event.seq)).toEqual([2]);
});

it.effectApp("interrupt reaches the live handle; a dead session fails softly", function* ({ scripted }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	yield* sight.fleetFeed.pipe(
		Stream.filter((fleet) =>
			fleet.agents.some(
				(agent) => agent.id === receipt.agentId && agent.sessions.some((session) => session.id === receipt.sessionId && session.canInterrupt),
			),
		),
		Stream.runHead,
	);
	yield* sight.interrupt(receipt.sessionId);
	const session = yield* scripted.session(receipt.sessionId);
	expect(session !== undefined && (yield* session.interrupted)).toBe(true);
	const outcome = yield* sight.interrupt("ghost").pipe(Effect.flip);
	expect(outcome._tag).toBe("SightFailure");
});

it.effectApp("retire through sight lands on the fleet as retired and closed", function* ({ scripted }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	yield* liveSession(scripted, receipt.sessionId);
	expect((yield* sight.fleet).agents.find((agent) => agent.id === receipt.agentId)?.status).toBe("alive");
	yield* endsTurn(scripted, receipt.sessionId);
	yield* sight.retire(receipt.agentId);
	const retired = yield* sight.fleetFeed.pipe(
		Stream.map((fleet) => fleet.agents.find((agent) => agent.id === receipt.agentId)),
		Stream.filter((agent) => agent?.status === "retired" && agent.sessions.every((session) => session.status === "closed")),
		Stream.runHead,
		Effect.map(Option.getOrThrow),
	);
	expect(retired?.status).toBe("retired");
	expect(retired?.sessions.every((session) => session.status === "closed")).toBe(true);
});
