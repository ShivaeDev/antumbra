import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { allowTestSessionOpenedWrites, rejectTestSessionOpenedWrites } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import {
	durableRows,
	hail,
	payload,
	reportsNativeRef,
	seedResumableAgent,
	untilTerminal,
	untilWaitingOrTerminal,
	WAKE_INSTRUCTION,
} from "#test/session-recovery-fixture.ts";

it.live("a failed durable opening append waits without taking the Session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const before = yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		yield* Effect.sync(() => rejectTestSessionOpenedWrites(temporary.database));
		const backend = reportsNativeRef(scripted.backend, scripted, "native-durable");

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const recovery = yield* hail(payload.sessionId);
			expect(yield* untilWaitingOrTerminal(recovery.changes)).toBe("waiting");
			const held = Option.getOrThrow(yield* db.Intent.where({ id: recovery.id }).first());
			expect(held.detail).toContain("durably record native identity");
			expect(yield* durableRows).toEqual(before);
			const events = yield* db.SessionEvent.where({
				sessionId: payload.sessionId,
			})
				.orderBy((event) => event.seq.asc())
				.all();
			expect(events.map((event) => event.seq)).toEqual([0, 1]);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed).toBeDefined();
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([WAKE_INSTRUCTION]);

			yield* Effect.sync(() => allowTestSessionOpenedWrites(temporary.database));
			yield* kernel.retry(held.id);
			expect(yield* untilTerminal(kernel.changes(held.id))).toBe("succeeded");
			expect(yield* scripted.opened).toHaveLength(3);
			const attached = yield* scripted.session(payload.sessionId);
			expect(attached).toBeDefined();
			expect(attached === undefined ? [] : yield* attached.sent).toEqual([WAKE_INSTRUCTION]);
			const settledEvents = yield* db.SessionEvent.where({
				sessionId: payload.sessionId,
			})
				.orderBy((event) => event.seq.asc())
				.all();
			expect(settledEvents.map((event) => event.seq)).toEqual([0, 1, 2]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend, {}, recorded.runner)));
	}),
);

it.live("ambiguous durable authority waits without choosing an assignment", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		const before = yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.PieceAgent.create({
				agentId: payload.agentId,
				pieceId: "piece-other",
			});
			return yield* durableRows;
		}).pipe(Effect.provide(temporary.layer));
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const recovery = yield* hail(payload.sessionId);
			expect(yield* untilWaitingOrTerminal(recovery.changes)).toBe("waiting");
			const held = Option.getOrThrow(yield* db.Intent.where({ id: recovery.id }).first());
			expect(held.detail).toContain("ambiguous current Piece authority");
			expect(yield* durableRows).toEqual(before);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend, {}, recorded.runner)));
	}),
);
