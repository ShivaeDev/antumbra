import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { mailWords } from "@antumbra/prompts";
import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, completesTurn, endTurn, makeScriptedBackend, rawOf, type ScriptedBackend } from "#test/harness.ts";
import { deliversMail, HAND, mailed, NATIVE, wakeIntents, working } from "#test/mail-delivery-fixture.ts";
import { eventually, refuseWhile, reportsNativeRef, untilTerminal, untilWaitingOrTerminal } from "#test/session-recovery-fixture.ts";

it.live("a turn ending with mail already waiting wakes the agent at once", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const live = yield* working(scripted);
			yield* mailed("the eastern approach is closed", "test:mail-at-the-boundary");
			yield* completesTurn(live);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* live.steered).toEqual([mailWords({ count: 1, precedence: "priority" })]);
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, reportsNativeRef(scripted.backend, scripted, NATIVE))));
	}),
);

const CARRIED = mailWords({ count: 1, precedence: "priority" });

// The agent is woken, answers, and rests again without ever marking the mail read.
const wokenOnce = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const live = yield* working(scripted);
		yield* mailed("the eastern approach is closed", "test:first-mail");
		yield* completesTurn(live);
		yield* eventually(
			Effect.gen(function* () {
				expect(yield* live.steered).toEqual([CARRIED]);
			}),
		);
		yield* live.emit({ raw: rawOf("assistant/message"), role: "agent", text: "read and carrying on", type: "message" });
		yield* endTurn(scripted, HAND.agentId);
		return live;
	});

it.live("mail a wake already carried never wakes the agent again on its own", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const live = yield* wokenOnce(scripted);
			yield* deliversMail;
			yield* deliversMail;
			expect(yield* wakeIntents).toHaveLength(1);
			expect(yield* live.steered).toEqual([CARRIED]);
			expect(yield* db.BoardEntryReceipt.all()).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, reportsNativeRef(scripted.backend, scripted, NATIVE))));
	}),
);

it.live("mail that arrives after a wake comes due again", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const live = yield* wokenOnce(scripted);
			yield* mailed("the northern channel is shoaling", "test:second-mail");
			yield* deliversMail;
			expect(yield* wakeIntents).toHaveLength(2);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* live.steered).toEqual([CARRIED, mailWords({ count: 2, precedence: "priority" })]);
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, reportsNativeRef(scripted.backend, scripted, NATIVE))));
	}),
);

it.live("mail adds no second wake while one is already pending", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const denied = yield* Ref.make(false);
		const refusing = refuseWhile(reportsNativeRef(scripted.backend, scripted, NATIVE), denied);
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			yield* working(scripted);
			yield* endTurn(scripted, HAND.agentId);
			const siesta = yield* kernel.submit(domain.siesta, { sessionId: HAND.sessionId });
			expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");

			yield* Ref.set(denied, true);
			yield* mailed("the eastern approach is closed", "test:one-wake-only");
			yield* deliversMail;
			const submitted = yield* wakeIntents;
			expect(submitted).toHaveLength(1);
			expect(yield* untilWaitingOrTerminal(kernel.changes(submitted[0]?.id ?? ""))).toBe("waiting");

			yield* deliversMail;
			expect(yield* wakeIntents).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, refusing)));
	}),
);
