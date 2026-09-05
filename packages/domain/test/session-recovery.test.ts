import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option, Ref, Stream } from "effect";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner, rawOf } from "#test/harness.ts";
import {
	durableRows,
	hail,
	payload,
	refuseWhile,
	reportsNativeRef,
	seedResumableAgent,
	untilTerminal,
	untilWaitingOrTerminal,
	WAKE_INSTRUCTION,
} from "#test/session-recovery-fixture.ts";

it.effect("a hail after a rebuild resumes the same native session and sequence", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const backend = reportsNativeRef(scripted.backend, scripted, "native-durable");
		const before = yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const sight = yield* makeSightSessionEvents;
			const recovery = yield* hail(payload.sessionId);
			expect(yield* untilTerminal(recovery.changes)).toBe("succeeded");
			const resumed = Option.getOrThrow(Option.fromUndefinedOr(yield* scripted.session(payload.sessionId)));
			expect(yield* scripted.opened).toHaveLength(2);
			expect(yield* resumed.sent).toEqual([WAKE_INSTRUCTION]);
			const secondOpen = (yield* scripted.opened)[1];
			expect(secondOpen?.resume).toEqual(Option.some("native-durable"));
			expect(secondOpen?.sessionId).toBe(payload.sessionId);
			expect(secondOpen?.tools.map((tool) => tool.name)).toContain("land_report");
			expect(yield* durableRows).toEqual(before);

			const continued = yield* sight
				.sessionEventFeed({ fromSeq: 3, sessionId: payload.sessionId })
				.pipe(Stream.take(1), Stream.runCollect, Effect.forkChild);
			yield* resumed.emit({
				raw: rawOf("assistant/resumed"),
				role: "agent",
				text: "continued after restart",
				type: "message",
			});
			expect((yield* Fiber.join(continued)).map((event) => event.seq)).toEqual([3]);
			const events = yield* db.SessionEvent.where({ sessionId: payload.sessionId })
				.orderBy((event) => event.seq.asc())
				.all();
			expect(events.map((event) => event.seq)).toEqual([0, 1, 2, 3]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend, {}, recorded.runner)));
	}),
);

it.effect("provider refusal waits without rewriting durable identity", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const before = yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(reportsNativeRef(scripted.backend, scripted, "native-durable"), denied);

		const recoveryId = yield* Effect.gen(function* () {
			const db = yield* Database;
			const recovery = yield* hail(payload.sessionId);
			expect(yield* untilWaitingOrTerminal(recovery.changes)).toBe("waiting");
			const held = Option.getOrThrow(yield* db.Intent.where({ id: recovery.id }).first());
			expect(held.detail).toContain("authentication is required");
			expect(yield* durableRows).toEqual(before);
			return held.id;
		}).pipe(Effect.provide(domainKernelLayer(temporary, refusing, {}, recorded.runner)));
		yield* Ref.set(denied, false);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const held = yield* db.Intent.where({ tag: "agent/wake" }).all();
			expect(held.map((intent) => intent.id)).toEqual([recoveryId]);
			expect(held[0]?.status).toBe("waiting");
			yield* kernel.retry(recoveryId);
			expect(yield* untilTerminal(kernel.changes(recoveryId))).toBe("succeeded");
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed).toBeDefined();
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([WAKE_INSTRUCTION]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, refusing, {}, recorded.runner)));
	}),
);

it.effect("a provider fork on resume waits without replacing the durable native identity", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const before = yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		const forked = reportsNativeRef(scripted.backend, scripted, "native-other");

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const recovery = yield* hail(payload.sessionId);
			expect(yield* untilWaitingOrTerminal(recovery.changes)).toBe("waiting");
			const held = Option.getOrThrow(yield* db.Intent.where({ id: recovery.id }).first());
			expect(held.detail).toContain("native-durable");
			expect(held.detail).toContain("native-other");
			expect(yield* durableRows).toEqual(before);
			const session = Option.getOrThrow(yield* db.AgentSession.where({ id: payload.sessionId }).first());
			expect(session.nativeRef).toBe("native-durable");
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed).toBeDefined();
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([WAKE_INSTRUCTION]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, forked, {}, recorded.runner)));
	}),
);
