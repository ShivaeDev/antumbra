import { SettingsSource, SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { HAND, idleBackend, openedNatively, passedAt, presenceOf, sessionRow, spawned } from "#test/session-idle-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

it.effectApp.withProviders("a turn ending keeps the acquisition, and the next words need no resume", idleBackend, function* (_, scripted) {
	const sight = yield* SightSource;
	yield* spawned;
	const live = yield* openedNatively(scripted);

	yield* endsTurn(scripted, HAND.sessionId);
	expect(yield* live.closed).toBe(false);
	const idle = yield* presenceOf;
	expect(idle.presence).toBe("idle");
	expect(idle.canSend).toBe(true);
	expect(idle.canInterrupt).toBe(false);

	yield* sight.send(HAND.sessionId, "one more thing");
	expect(yield* live.sent).toEqual([HAND.charter]);
	expect(yield* live.steered).toEqual(["one more thing"]);
	expect(yield* scripted.opened).toHaveLength(1);
	expect((yield* sessionRow).executionStatus).toBe("active");
	expect((yield* presenceOf).presence).toBe("working");
});

it.effectApp.withProviders("the configured idle threshold controls when siesta begins", idleBackend, function* (_, scripted) {
	const db = yield* Database;
	const kernel = yield* Kernel;
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "idleSiestaMinutes", value: 5 });
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);

	yield* passedAt(4 * 60_000);
	expect(yield* db.Intent.where({ tag: "session/siesta" }).all()).toEqual([]);
	expect(yield* live.closed).toBe(false);

	yield* passedAt(6 * 60_000);
	const demanded = yield* db.Intent.where({ tag: "session/siesta" }).all();
	expect(demanded).toHaveLength(1);
	expect(demanded[0]?.payload).toContain(HAND.sessionId);
	expect(yield* untilTerminal(kernel.changes(demanded[0]?.id ?? ""))).toBe("succeeded");

	expect(yield* live.closed).toBe(true);
	const row = yield* sessionRow;
	expect(row.status).toBe("open");
	expect(row.executionStatus).toBe("idle");
	expect(row.nativeRef).toBe("native-idle");
});
