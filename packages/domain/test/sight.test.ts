import { SightSource } from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Effect, Fiber, Stream } from "effect";
import { standDown } from "#test/harness.ts";
import { it } from "#test/runtime-harness.ts";
import { eventually, liveSession, note, spawnRequest } from "#test/sight-fixture.ts";

it.effectApp("spawn surfaces on the fleet feed once the agent lives", { clock: "live" }, function* () {
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

it.effectApp("the event feed rehydrates from the log then stays live, no dupes", { clock: "live" }, function* ({ scripted }) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	const session = yield* liveSession(scripted, receipt.sessionId);
	yield* session.emit(note(0));
	yield* session.emit(note(1));
	yield* eventually(
		Effect.gen(function* () {
			const rows = yield* sight.sessionEvents({
				fromSeq: 0,
				sessionId: receipt.sessionId,
			});
			expect(rows).toHaveLength(2);
		}),
	);
	const rehydratedUnknown: StoredEvent = {
		kind: "future.event",
		payload: "future bytes {",
		seq: 2,
		sessionId: receipt.sessionId,
	};
	yield* db.SessionEvent.create(rehydratedUnknown);
	const collector = yield* sight
		.sessionEventFeed({ fromSeq: 0, sessionId: receipt.sessionId })
		.pipe(Stream.take(4), Stream.runCollect, Effect.forkChild);
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

it.effectApp("interrupt reaches the live handle; a dead session fails softly", { clock: "live" }, function* ({ scripted }) {
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

it.effectApp("retire through sight lands on the fleet as retired and closed", { clock: "live" }, function* ({ scripted }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	yield* eventually(
		Effect.gen(function* () {
			const fleet = yield* sight.fleet;
			const agent = fleet.agents.find((a) => a.id === receipt.agentId);
			expect(agent?.status).toBe("alive");
		}),
	);
	yield* standDown(scripted, receipt.agentId);
	yield* sight.retire(receipt.agentId);
	yield* eventually(
		Effect.gen(function* () {
			const fleet = yield* sight.fleet;
			const agent = fleet.agents.find((a) => a.id === receipt.agentId);
			expect(agent?.status).toBe("retired");
			expect(agent?.sessions.every((s) => s.status === "closed")).toBe(true);
		}),
	);
});
