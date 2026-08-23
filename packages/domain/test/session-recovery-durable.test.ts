import { Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import {
	allowTestSessionOpenedWrites,
	rejectTestSessionOpenedWrites,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import {
	durableRows,
	eventually,
	payload,
	RECOVERY_INSTRUCTION,
	reportsNativeRef,
	seedResumableAgent,
	waitingRecovery,
} from "#test/session-recovery-fixture.ts";

// why: what a resume does when the record itself is the thing that will not
// answer — a write that fails, or rows that give two answers to one question.
// The provider is willing in both, so nothing here is about what it said; the
// discipline is that a resume the record cannot back does not take the Session
// and leaves the durable truth exactly as it found it.

it.live(
	"a failed durable opening append waits without taking the Session",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const before = yield* seedResumableAgent(
				temporary,
				scripted.backend,
				recorded.runner,
				scripted,
			);
			yield* Effect.sync(() =>
				rejectTestSessionOpenedWrites(temporary.database),
			);
			const backend = reportsNativeRef(
				scripted.backend,
				scripted,
				"native-durable",
			);

			yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				const held = yield* eventually(waitingRecovery);
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
				// why: the words reach the provider before the opening is confirmed, so
				// an attachment that then fails to record its identity has already said
				// its sentence. What it must not do is keep the Session, and the parked
				// row with the durable log untouched is that.
				expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
					RECOVERY_INSTRUCTION,
				]);

				yield* Effect.sync(() =>
					allowTestSessionOpenedWrites(temporary.database),
				);
				yield* kernel.retry(held.id);
				yield* eventually(
					Effect.gen(function* () {
						const retried = yield* db.Intent.where({ id: held.id }).first();
						expect(Option.getOrThrow(retried).status).toBe("succeeded");
						expect(yield* scripted.opened).toHaveLength(3);
						const attached = yield* scripted.session(payload.sessionId);
						expect(attached).toBeDefined();
						expect(attached === undefined ? [] : yield* attached.sent).toEqual([
							RECOVERY_INSTRUCTION,
						]);
					}),
				);
				const settledEvents = yield* db.SessionEvent.where({
					sessionId: payload.sessionId,
				})
					.orderBy((event) => event.seq.asc())
					.all();
				expect(settledEvents.map((event) => event.seq)).toEqual([0, 1, 2]);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend, {}, recorded.runner),
				),
			);
		}),
);

it.live(
	"ambiguous durable authority waits without choosing an assignment",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			yield* seedResumableAgent(
				temporary,
				scripted.backend,
				recorded.runner,
				scripted,
			);
			const before = yield* Effect.gen(function* () {
				const db = yield* Database;
				const writer = yield* Writer;
				yield* writer.write(
					db.PieceAgent.create({
						agentId: payload.agentId,
						pieceId: "piece-other",
					}),
				);
				return yield* durableRows;
			}).pipe(Effect.provide(temporary.layer));
			yield* Effect.gen(function* () {
				const held = yield* eventually(waitingRecovery);
				expect(held.detail).toContain("ambiguous current Piece authority");
				expect(yield* durableRows).toEqual(before);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, scripted.backend, {}, recorded.runner),
				),
			);
		}),
);
