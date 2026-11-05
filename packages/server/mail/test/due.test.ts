import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { expect } from "vitest";
import { messageOf, request, sending } from "#test/kit.ts";

postgresApp.it("waits for routine mail and carries the entire unread batch once due", [], function* ({ api, mailSession, clock, rebuild }) {
	const { agentId } = yield* mailSession();
	const sent = yield* clock.now();
	yield* api["mail.send"](sending("shoal", agentId));
	expect(yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).toEqual({ wakes: [], waitUntil: sent + 60_000 });
	yield* clock.advance(59_999);
	expect((yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).wakes).toEqual([]);
	yield* clock.advance(1);
	expect((yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).wakes).toMatchObject([
		{ batch: { count: 1, precedence: "routine" }, unreadIds: [messageOf("shoal")], waitedMillis: 60_000 },
	]);
	yield* api["mail.markDelivered"]({ agentId, ids: [messageOf("shoal")], requestId: request("carried") });
	expect(yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).toEqual({ wakes: [], waitUntil: null });
	yield* api["mail.send"]({ ...sending("channel", agentId), precedence: "priority" });
	const due = yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes");
	expect(due.wakes).toMatchObject([{ batch: { count: 2, precedence: "priority" }, unreadIds: [messageOf("shoal"), messageOf("channel")] }]);
	yield* rebuild();
	expect(yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).toEqual(due);
	yield* api["mail.markRead"]({ agentId, ids: [messageOf("shoal"), messageOf("channel")], requestId: request("read") });
	expect(yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).toEqual({ wakes: [], waitUntil: null });
});
