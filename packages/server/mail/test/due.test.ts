import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { MailWakeEvidence } from "@antumbra/platform-vocabulary/mail-evidence.ts";
import { Schema } from "effect";
import { expect } from "vitest";
import { evidence, messageOf, request, resting, sending } from "#test/kit.ts";

postgresApp.it("waits for routine mail and carries the entire unread batch once due", [], function* ({ api, observeMail, clock, rebuild }) {
	yield* observeMail(request("resting"), evidence);
	const sent = yield* clock.now();
	yield* api["mail.send"](sending("shoal"));
	expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: sent + 60_000 });
	yield* clock.advance(59_999);
	expect((yield* api["mail.dueWakes"]({})).wakes).toEqual([]);
	yield* clock.advance(1);
	expect((yield* api["mail.dueWakes"]({})).wakes).toMatchObject([
		{ batch: { count: 1, precedence: "routine" }, unreadIds: [messageOf("shoal")], waitedMillis: 60_000 },
	]);
	yield* api["mail.markDelivered"]({ agentId: "hand", ids: [messageOf("shoal")], requestId: request("carried") });
	expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: null });
	yield* api["mail.send"]({ ...sending("channel"), precedence: "priority" });
	const due = yield* api["mail.dueWakes"]({});
	expect(due.wakes).toMatchObject([{ batch: { count: 2, precedence: "priority" }, unreadIds: [messageOf("shoal"), messageOf("channel")] }]);
	yield* rebuild();
	expect(yield* api["mail.dueWakes"]({})).toEqual(due);
	yield* api["mail.markRead"]({ agentId: "hand", ids: [messageOf("shoal"), messageOf("channel")], requestId: request("read") });
	expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: null });
});

postgresApp.it("excludes stopped, closed, busy and child sessions and agents that are not alive", [], function* ({ api, observeMail }) {
	yield* api["mail.send"]({ ...sending("shoal"), precedence: "flash" });
	for (const [index, patch] of [
		{ stoppedAt: "2026-11-03T00:00:00Z" },
		{ status: "closed" },
		{ executionStatus: "active" },
		{ executionStatus: "draining" },
		{ parentSessionId: "parent" },
	].entries()) {
		yield* observeMail(
			request(`session:${index}`),
			Schema.decodeUnknownSync(MailWakeEvidence)({ ...evidence, sessions: [{ ...resting, ...patch }] }),
		);
		expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: null });
	}
	for (const status of ["spawning", "dormant", "retired"] as const) {
		yield* observeMail(request(status), { ...evidence, agents: [{ id: "hand", status }] });
		expect((yield* api["mail.dueWakes"]({})).wakes).toEqual([]);
	}
	yield* observeMail(request("missing-agent"), { ...evidence, agents: [] });
	expect((yield* api["mail.dueWakes"]({})).wakes).toEqual([]);
	yield* observeMail(request("resting"), evidence);
	expect((yield* api["mail.dueWakes"]({})).wakes).toMatchObject([
		{ agentId: "hand", sessionId: "root", voyageId: null, batch: { precedence: "flash" } },
	]);
});
