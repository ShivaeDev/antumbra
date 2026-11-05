import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { messageOf, request, sending } from "#test/kit.ts";

postgresApp.it(
	"changes pending delivery and due readings only after commit and discards rollback",
	[],
	function* ({ api, mailSession, mailHistory, clearPublished, published, transaction, rollback, clock }) {
		const { agentId } = yield* mailSession();
		yield* api["mail.send"](sending("shoal", agentId));
		yield* clock.advance(60_000);
		yield* clearPublished();
		const due = yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes");
		const before = yield* answered(api["mail.unread"]({ agentId }), "mail.unread");
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
		expect(yield* answered(api["mail.unread"]({ agentId }), "mail.unread")).toEqual(before);
		expect(yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).toEqual(due);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect((yield* answered(api["mail.unread"]({ agentId }), "mail.unread"))[0]?.deliveredAt).not.toBeNull();
		expect(yield* answered(api["mail.dueWakes"]({}), "mail.dueWakes")).toEqual({ wakes: [], waitUntil: null });
		expect(yield* published()).toContain("message");
		yield* clearPublished();
		yield* rollback(mailHistory.append(request("rollback"), { _tag: "MessageRead", ids: [messageOf("shoal")], readAt: "2026-11-03T12:00:00.000Z" }));
		expect(yield* answered(api["mail.unread"]({ agentId }), "mail.unread")).toHaveLength(1);
		expect(yield* mailHistory.read(messageOf("shoal"))).toHaveLength(2);
		expect(yield* published()).toEqual([]);
	},
);
