import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import {
	eventually,
	hail,
	payload,
	reportsNativeRef,
	seedResumableAgent,
	untilTerminal,
	WAKE_INSTRUCTION,
	waitingWake,
} from "#test/session-recovery-fixture.ts";

it.live("retirement cancels a wake attachment blocked while opening", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		const opening = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const resumed = reportsNativeRef(scripted.backend, scripted, "native-durable");
		const blocked: AgentBackend = {
			...resumed,
			openSession: (options) =>
				Option.isSome(options.resume)
					? Deferred.succeed(opening, undefined).pipe(Effect.andThen(Deferred.await(release)), Effect.andThen(resumed.openSession(options)))
					: resumed.openSession(options),
		};

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			yield* hail(payload.sessionId);
			yield* Deferred.await(opening);
			const retirement = yield* kernel.submit(domain.retire, {
				agentId: payload.agentId,
			});
			expect(yield* untilTerminal(retirement.changes)).toBe("succeeded");
			yield* Deferred.succeed(release, undefined);
			yield* eventually(
				Effect.gen(function* () {
					const held = yield* waitingWake;
					expect(held.detail).toContain("stopped while attaching");
					const agent = Option.getOrThrow(yield* db.Agent.where({ id: payload.agentId }).first());
					const session = Option.getOrThrow(yield* db.AgentSession.where({ id: payload.sessionId }).first());
					expect(agent).toMatchObject({
						currentSessionId: null,
						status: "retired",
					});
					expect(session.status).toBe("closed");
					expect(yield* scripted.opened).toHaveLength(1);
					const original = yield* scripted.session(payload.sessionId);
					expect(original).toBeDefined();
					expect(original === undefined ? [] : yield* original.sent).not.toContain(WAKE_INSTRUCTION);
					expect(original !== undefined && (yield* original.closed)).toBe(true);
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, blocked, {}, recorded.runner)));
	}),
);
