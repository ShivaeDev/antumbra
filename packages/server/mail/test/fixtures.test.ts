import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { captureJournal } from "@antumbra/app-testing/test-support/journal-replay.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { checkPostgresFixture } from "@antumbra/server-journal/postgres/fixture.ts";
import { expect } from "vitest";
import { messageOf, request, sending } from "#test/kit.ts";

postgresApp.it(
	"replays captured Mail and wake evidence and continues through real commands",
	[],
	function* ({ api, journal, replayJournal, observeMailJournal, clock, rebuild }) {
		const legacy = yield* journal();
		for (const key of ["wakeOnRoutineMail", "wakeOnPriorityMail", "wakeOnFlashMail"] as const) yield* legacy.api.settings.setFlag({ key, on: false });
		const runner = yield* legacy.runner({ runnerId: "runner", logId: "mail", backends: [], imageInputBackends: [] });
		const birth = request("hand");
		const { agentId, sessionId } = identity(birth);
		yield* legacy.api.agents.spawn({ requestId: birth, role: "hand", backend: "claude", model: null, effort: null });
		yield* runner.append([
			{
				logId: "mail",
				cursor: 0,
				at: 0,
				event: {
					type: "SessionStarted",
					requestId: birth,
					sessionId,
					agentId,
					backend: "claude",
					cwd: "/berth",
					nativeRef: "native",
					runnerId: "runner",
					toolSetVersion: "1",
				},
			},
			{ logId: "mail", cursor: 1, at: 1, event: { type: "InputAccepted", requestId: birth, sessionId, inputId: "charter" } },
			{
				logId: "mail",
				cursor: 2,
				at: 2,
				event: {
					type: "ProviderEvent",
					sessionId,
					observation: "live",
					event: { type: "turn.completed", status: "completed", raw: { source: "scripted", kind: "turn.completed", payload: "{}" } },
				},
			},
		]);
		yield* legacy.api.settings.setCount({ key: "routineMailMinutes", count: 1 });
		yield* legacy.api.mail.send(sending("shoal", agentId));
		yield* legacy.api.mail.send(sending("channel", agentId));
		yield* legacy.api.mail.markDelivered({ agentId, ids: [messageOf("channel")] });
		yield* legacy.api.mail.markRead({ agentId, ids: [messageOf("channel")] });
		const snapshot = yield* replayJournal(legacy);
		expect(snapshot.mailSnapshot.messages).toHaveLength(2);
		expect(yield* checkPostgresFixture(yield* captureJournal(legacy))).toMatchObject({ messages: 2 });
		expect(yield* api["mail.mailbox"]({ agentId })).toEqual(yield* answered(legacy.api.mail.mailbox({ agentId }), "captured mailbox"));
		const waiting = yield* api["mail.dueWakes"]({});
		expect(waiting).toEqual(yield* answered(legacy.api.mail.dueWakes({}), "journal due readings"));
		expect(waiting).toEqual({ wakes: [], waitUntil: (yield* clock.now()) + 60_000 });
		yield* clock.advance(60_000);
		const due = yield* api["mail.dueWakes"]({});
		expect(due).toEqual(yield* answered(legacy.api.mail.dueWakes({}), "due journal mail"));
		expect(due.wakes).toMatchObject([{ agentId, sessionId, batch: { count: 1, precedence: "routine" } }]);
		yield* rebuild();
		expect(yield* api["mail.dueWakes"]({})).toEqual(due);
		const delivery = { agentId, ids: [messageOf("shoal")], requestId: request("new-delivery") };
		yield* legacy.api.mail.markDelivered(delivery);
		yield* api["mail.markDelivered"](delivery);
		expect(yield* api["mail.dueWakes"]({})).toEqual(yield* answered(legacy.api.mail.dueWakes({}), "delivered journal mail"));
		yield* legacy.api.mail.send({ ...sending("flash", agentId), precedence: "flash" });
		yield* api["mail.send"]({ ...sending("flash", agentId), precedence: "flash" });
		expect(yield* api["mail.dueWakes"]({})).toEqual(yield* answered(legacy.api.mail.dueWakes({}), "flash journal mail"));
		yield* legacy.api.sessions.stop({ sessionId, reason: "hold", requestedAt: new Date(yield* clock.now()).toISOString() });
		yield* observeMailJournal(legacy, request("stopped"));
		expect(yield* api["mail.dueWakes"]({})).toEqual(yield* answered(legacy.api.mail.dueWakes({}), "stopped journal mail"));
		expect((yield* api["mail.dueWakes"]({})).wakes).toEqual([]);
	},
);
