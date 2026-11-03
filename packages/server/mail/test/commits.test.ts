import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { evidence, messageOf, request, sending } from "#test/kit.ts";

postgresApp.it(
	"publishes the same Mail refresh keys as the journal, including empty receipts",
	[],
	function* ({ api, journal, clearPublished, published }) {
		const legacy = yield* journal();
		const watched = yield* legacy.watchKeys(["message", "message:hand", "message:mate"]);
		yield* legacy.api.mail.send(sending("shoal"));
		yield* api["mail.send"](sending("shoal"));
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
		for (const ids of [[messageOf("shoal"), messageOf("shoal")], [messageOf("shoal")], []]) {
			for (const operation of ["delivered", "read"] as const) {
				watched.clear();
				yield* clearPublished();
				const input = { agentId: "hand", ids, requestId: request(`${operation}:${ids.length}`) };
				if (operation === "delivered") {
					yield* legacy.api.mail.markDelivered(input);
					yield* api["mail.markDelivered"](input);
				} else {
					yield* legacy.api.mail.markRead(input);
					yield* api["mail.markRead"](input);
				}
				expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
			}
		}
	},
);

postgresApp.it(
	"changes pending delivery and due readings only after commit and discards rollback",
	[],
	function* ({ api, observeMail, mailHistory, clearPublished, published, transaction, rollback, clock }) {
		yield* observeMail(request("resting"), evidence);
		yield* api["mail.send"](sending("shoal"));
		yield* clock.advance(60_000);
		yield* clearPublished();
		const due = yield* api["mail.dueWakes"]({});
		const before = yield* api["mail.unread"]({ agentId: "hand" });
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* mailHistory.append(request("delivery"), {
					_tag: "MessageDelivered",
					ids: [messageOf("shoal")],
					deliveredAt: new Date(yield* clock.now()).toISOString(),
				});
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* api["mail.unread"]({ agentId: "hand" })).toEqual(before);
		expect(yield* api["mail.dueWakes"]({})).toEqual(due);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect((yield* api["mail.unread"]({ agentId: "hand" }))[0]?.deliveredAt).not.toBeNull();
		expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: null });
		expect(new Set(yield* published())).toEqual(new Set(["message", "message:hand"]));
		yield* clearPublished();
		yield* rollback(mailHistory.append(request("rollback"), { _tag: "MessageRead", ids: [messageOf("shoal")], readAt: "2026-11-03T12:00:00.000Z" }));
		expect(yield* api["mail.unread"]({ agentId: "hand" })).toHaveLength(1);
		expect(yield* mailHistory.read(messageOf("shoal"))).toHaveLength(2);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"uses committed wake evidence and keeps the previous eligibility after rollback",
	[],
	function* ({ api, observeMail, mailHistory, transaction, rollback, clock, clearPublished, published }) {
		yield* observeMail(request("resting"), evidence);
		yield* api["mail.send"](sending("shoal"));
		const now = yield* clock.now();
		expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: now + 60_000 });
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		yield* clearPublished();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* mailHistory.append(request("longer-window"), { _tag: "MailWakeObserved", ...evidence, quietMillis: 120_000 });
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: now + 60_000 });
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: now + 120_000 });
		yield* clock.advance(120_000);
		const due = yield* api["mail.dueWakes"]({});
		expect(due.wakes).toHaveLength(1);
		yield* clearPublished();
		yield* rollback(mailHistory.append(request("busy-rollback"), { _tag: "MailWakeObserved", ...evidence, sessions: [] }));
		expect(yield* api["mail.dueWakes"]({})).toEqual(due);
		expect(yield* published()).toEqual([]);
		yield* observeMail(request("busy"), { ...evidence, sessions: [] });
		expect(yield* api["mail.dueWakes"]({})).toEqual({ wakes: [], waitUntil: null });
	},
);
