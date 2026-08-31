import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner, rawOf, sessionFor } from "#test/harness.ts";
import {
	eventually,
	payload,
	refuseWhile,
	reportsNativeRef,
	seedResumableAgent,
	untilTerminal,
	untilWaitingOrTerminal,
} from "#test/session-recovery-fixture.ts";
import { openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";

const executionStatusOf = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const session = yield* db.AgentSession.where({ id: sessionId }).first();
		return Option.getOrThrow(session).executionStatus;
	});

const sleep = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.AgentSession.where({ id: sessionId }).update({
			executionStatus: "idle",
		});
	});

it.live("a Session wakes when its resume attaches, and not before", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		yield* sleep(payload.sessionId).pipe(Effect.provide(temporary.layer));
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(reportsNativeRef(scripted.backend, scripted, "native-durable"), denied);

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(domain.wake, {
				sessionId: payload.sessionId,
			});
			expect(yield* untilWaitingOrTerminal(submission.changes)).toBe("waiting");
			const held = Option.getOrThrow(yield* Database.use((db) => db.Intent.where({ id: submission.id }).first()));
			expect(held.detail).toContain("authentication is required");
			expect(yield* executionStatusOf(payload.sessionId)).toBe("idle");

			yield* Ref.set(denied, false);
			yield* kernel.retry(submission.id);
			expect(yield* untilTerminal(kernel.changes(submission.id))).toBe("succeeded");
			expect(yield* executionStatusOf(payload.sessionId)).toBe("active");
		}).pipe(Effect.provide(domainKernelLayer(temporary, refusing, {}, recorded.runner)));
	}),
);

it.live("a hail of a captain that is answering leaves its work alone", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const backend = reportsNativeRef(scripted.backend, scripted, "native-captain");
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const voyage = yield* openReefVoyage;
			const hailed = yield* domain.voyages.hail(voyage.id);
			expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
			const live = yield* sessionFor(scripted, hailed.agentId);
			yield* live.emit({
				nativeRef: "native-captain",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			const session = yield* eventually(
				Effect.gen(function* () {
					const rows = yield* db.AgentSession.where({
						agentId: hailed.agentId,
					}).all();
					const row = Option.getOrThrow(Option.fromUndefinedOr(rows[0]));
					expect(row.nativeRef).toBe("native-captain");
					return row;
				}),
			);
			const spoken = yield* live.sent;

			const again = yield* domain.voyages.hail(voyage.id);
			expect(yield* untilTerminal(kernel.changes(again.intentId))).toBe("succeeded");
			expect(yield* live.sent).toEqual(spoken);
			expect(yield* live.closed).toBe(false);
			expect(yield* scripted.opened).toHaveLength(1);
			expect((yield* db.AgentSession.where({ agentId: hailed.agentId }).all()).map((row) => [row.id, row.executionStatus])).toEqual([
				[session.id, "active"],
			]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
	}),
);
