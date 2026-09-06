import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { mailWords } from "@antumbra/prompts/mail.ts";
import { SessionFabric } from "@antumbra/session-fabric";
import { endsTurn, it } from "@antumbra/testing";
import { expect, it as vitest } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, sessionFor } from "#test/harness.ts";
import { deliversMail, HAND, mailed, NATIVE, wakeIntents, working } from "#test/mail-delivery-fixture.ts";
import { reportsNativeRef, untilTerminal } from "#test/session-recovery-fixture.ts";

const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(yield* db.AgentSession.where({ id: HAND.sessionId }).first());
});

it.effectApp("a turn ending rests the session and disturbs nothing else", function* ({ scripted }) {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const live = yield* working(scripted);
	const agentBefore = yield* db.Agent.where({ id: HAND.agentId }).first();
	const moorageBefore = yield* db.Moorage.where({
		agentId: HAND.agentId,
	}).first();
	const sessionBefore = yield* sessionRow;
	const attached = yield* fabric.attached();
	expect(
		(yield* fleetSnapshot(["scripted"], new Set(), [], [], {
			attached,
			delegating: new Set(),
		})).agents[0]?.sessions[0]?.canInterrupt,
	).toBe(true);

	yield* endsTurn(scripted, HAND.sessionId);
	const stillAttached = yield* fabric.attached();
	expect(stillAttached.has(HAND.sessionId)).toBe(true);
	const summary = (yield* fleetSnapshot(["scripted"], new Set(), [], [], {
		attached: stillAttached,
		delegating: new Set(),
	})).agents[0]?.sessions[0];
	expect(summary?.canInterrupt).toBe(false);
	expect(summary?.canSend).toBe(true);
	expect(summary?.presence).toBe("idle");
	expect(yield* live.closed).toBe(false);

	expect(yield* db.Agent.where({ id: HAND.agentId }).first()).toEqual(agentBefore);
	expect(yield* db.Moorage.where({ agentId: HAND.agentId }).first()).toEqual(moorageBefore);
	expect(yield* sessionRow).toEqual({
		...sessionBefore,
		executionStatus: "idle",
	});
	expect(Option.getOrThrow(yield* db.Agent.where({ id: HAND.agentId }).first()).status).toBe("alive");
});

vitest.effect("boot settles a draining Session without recovering its provider thread", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(domain.spawn, HAND);
			expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.AgentSession.where({ id: HAND.sessionId }).update({
				executionStatus: "draining",
			});
		}).pipe(Effect.provide(temporary.layer));

		yield* Effect.gen(function* () {
			expect((yield* sessionRow).executionStatus).toBe("idle");
			expect(yield* scripted.opened).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

vitest.effect("mail that arrived while an agent slept wakes it on the next restart", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);
		yield* Effect.gen(function* () {
			yield* working(scripted);
			yield* endsTurn(scripted, HAND.sessionId);
			yield* mailed("the eastern approach is closed", "test:mail-wakes");
			expect(yield* scripted.opened).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));

		yield* Effect.gen(function* () {
			expect((yield* sessionRow).executionStatus).toBe("idle");
			yield* deliversMail;
			const kernel = yield* Kernel;
			const wakes = yield* wakeIntents;
			expect(wakes).toHaveLength(1);
			for (const wake of wakes) {
				expect(yield* untilTerminal(kernel.changes(wake.id))).toBe("succeeded");
			}
			expect(yield* scripted.opened).toHaveLength(2);
			const resumed = yield* sessionFor(scripted, HAND.agentId);
			expect(yield* resumed.sent).toEqual([mailWords({ count: 1, precedence: "priority" })]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
	}),
);
