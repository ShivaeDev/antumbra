import { SightSource } from "@antumbra/contract";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentEvent } from "@antumbra/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Schedule, Stream } from "effect";
import { SightSourceLive } from "#sight.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	rawOf,
	type ScriptedBackend,
} from "#test/harness.ts";

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const sightLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
	);

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

const note = (n: number): AgentEvent => ({
	raw: rawOf("assistant"),
	role: "agent",
	text: `note ${n}`,
	type: "message",
});

const liveSession = (scripted: ScriptedBackend, sessionId: string) =>
	eventually(
		scripted
			.session(sessionId)
			.pipe(
				Effect.flatMap((live) =>
					live === undefined
						? Effect.fail("not live yet")
						: Effect.succeed(live),
				),
			),
	);

it.live("spawn surfaces on the fleet feed once the agent lives", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			// why: the agent surfaces before its moorage is provisioned, so the
			// feed legitimately shows it session-less first — the test waits for
			// the snapshot that carries the session.
			const settled = yield* sight.fleetFeed.pipe(
				Stream.filter((fleet) =>
					fleet.agents.some(
						(agent) =>
							agent.id === receipt.agentId &&
							agent.status === "alive" &&
							agent.sessions.length > 0,
					),
				),
				Stream.take(1),
				Stream.runCollect,
			);
			const agent = settled[0]?.agents.find((a) => a.id === receipt.agentId);
			expect(agent?.role).toBe("navigator");
			expect(agent?.sessions.map((session) => session.id)).toEqual([
				receipt.sessionId,
			]);
			expect(agent?.sessions[0]?.backend).toBe("scripted");
			expect(settled[0]?.backends).toEqual(["scripted"]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live(
	"the event feed rehydrates from the log then stays live, no dupes",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
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
				const collector = yield* sight
					.sessionEventFeed({ fromSeq: 0, sessionId: receipt.sessionId })
					.pipe(Stream.take(3), Stream.runCollect, Effect.forkChild);
				yield* session.emit(note(2));
				const events = yield* Fiber.join(collector);
				expect(events.map((event) => event.seq)).toEqual([0, 1, 2]);
				const tail = yield* sight
					.sessionEventFeed({ fromSeq: 2, sessionId: receipt.sessionId })
					.pipe(Stream.take(1), Stream.runCollect);
				expect(tail.map((event) => event.seq)).toEqual([2]);
			}).pipe(Effect.provide(sightLayer(temporary, scripted)));
		}),
);

it.live("interrupt reaches the live handle; a dead session fails softly", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					expect(fleet.agents.some((a) => a.id === receipt.agentId)).toBe(true);
				}),
			);
			yield* sight.interrupt(receipt.sessionId);
			const session = yield* scripted.session(receipt.sessionId);
			expect(session !== undefined && (yield* session.interrupted)).toBe(true);
			const outcome = yield* sight.interrupt("ghost").pipe(Effect.flip);
			expect(outcome._tag).toBe("SightFailure");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("retire through sight lands on the fleet as retired and closed", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					const agent = fleet.agents.find((a) => a.id === receipt.agentId);
					expect(agent?.status).toBe("alive");
				}),
			);
			yield* sight.retire(receipt.agentId);
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					const agent = fleet.agents.find((a) => a.id === receipt.agentId);
					expect(agent?.status).toBe("retired");
					expect(agent?.sessions.every((s) => s.status === "closed")).toBe(
						true,
					);
				}),
			);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
