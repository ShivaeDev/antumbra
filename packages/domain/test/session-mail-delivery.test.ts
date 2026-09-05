import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { mailWords } from "@antumbra/prompts";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { completesTurn, makeScriptedBackend, rawOf, type ScriptedBackend } from "#test/harness.ts";
import { deliversMail, HAND, mailed, NATIVE, wakeIntents, working } from "#test/mail-delivery-fixture.ts";
import { refuseWhile, reportsNativeRef, untilTerminal, untilWaitingOrTerminal } from "#test/session-recovery-fixture.ts";

const mailBackend = makeScriptedBackend.pipe(
	Effect.map((scripted) => ({
		providers: { backends: new Map([[scripted.backend.tag, reportsNativeRef(scripted.backend, scripted, NATIVE)]]) },
		state: scripted,
	})),
);

const mailDelivered = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const input = yield* scripted.steered;
		expect(input.sessionId).toBe(HAND.sessionId);
		const kernel = yield* Kernel;
		const wakes = yield* wakeIntents;
		expect(wakes.length).toBeGreaterThan(0);
		for (const wake of wakes) {
			expect(yield* untilTerminal(kernel.changes(wake.id))).toBe("succeeded");
		}
	});

it.effectApp.withProviders("a turn ending with mail already waiting wakes the agent at once", mailBackend, function* (_, scripted) {
	const live = yield* working(scripted);
	yield* mailed("the eastern approach is closed", "test:mail-at-the-boundary");
	yield* completesTurn(live);
	yield* mailDelivered(scripted);
	expect(yield* live.steered).toEqual([mailWords({ count: 1, precedence: "priority" })]);
});

const CARRIED = mailWords({ count: 1, precedence: "priority" });

const wokenOnce = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const live = yield* working(scripted);
		yield* mailed("the eastern approach is closed", "test:first-mail");
		yield* completesTurn(live);
		yield* mailDelivered(scripted);
		expect(yield* live.steered).toEqual([CARRIED]);
		yield* live.emit({ raw: rawOf("assistant/message"), role: "agent", text: "read and carrying on", type: "message" });
		yield* endsTurn(scripted, HAND.sessionId);
		return live;
	});

it.effectApp.withProviders("mail a wake already carried never wakes the agent again on its own", mailBackend, function* (_, scripted) {
	const db = yield* Database;
	const live = yield* wokenOnce(scripted);
	yield* deliversMail;
	yield* deliversMail;
	expect(yield* wakeIntents).toHaveLength(1);
	expect(yield* live.steered).toEqual([CARRIED]);
	expect(yield* db.BoardEntryReceipt.all()).toEqual([]);
});

it.effectApp.withProviders("mail that arrives after a wake comes due again", mailBackend, function* (_, scripted) {
	const live = yield* wokenOnce(scripted);
	yield* mailed("the northern channel is shoaling", "test:second-mail");
	yield* deliversMail;
	expect(yield* wakeIntents).toHaveLength(2);
	yield* mailDelivered(scripted);
	expect(yield* live.steered).toEqual([CARRIED, mailWords({ count: 2, precedence: "priority" })]);
});

it.effectApp.withProviders(
	"mail adds no second wake while one is already pending",
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const denied = yield* Ref.make(false);
		const backend = refuseWhile(reportsNativeRef(scripted.backend, scripted, NATIVE), denied);
		return { providers: { backends: new Map([[backend.tag, backend]]) }, state: { scripted, denied } };
	}),
	function* (_, { scripted, denied }) {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		yield* working(scripted);
		yield* endsTurn(scripted, HAND.sessionId);
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
	},
);
