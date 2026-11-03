import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { messageOf, request, sending } from "#test/kit.ts";

postgresApp.it("keeps receipt times and mailbox order when receipts repeat", [], function* ({ api, clock, rebuild, mailHistory }) {
	yield* api["mail.send"](sending("shoal"));
	yield* api["mail.send"](sending("channel"));
	const ids = [messageOf("shoal"), messageOf("shoal")];
	yield* api["mail.markDelivered"]({ agentId: "hand", ids, requestId: request("delivered") });
	const carried = yield* api["mail.unread"]({ agentId: "hand" });
	expect(carried.map((row) => row.id)).toEqual([messageOf("shoal"), messageOf("channel")]);
	expect(carried[0]).toMatchObject({ body: "shoal", readAt: null, deliveredAt: new Date(yield* clock.now()).toISOString() });
	yield* clock.advance(10_000);
	yield* api["mail.markDelivered"]({ agentId: "hand", ids, requestId: request("delivered-again") });
	expect(yield* api["mail.unread"]({ agentId: "hand" })).toEqual(carried);
	yield* api["mail.markRead"]({ agentId: "hand", ids, requestId: request("read") });
	const read = yield* api["mail.mailbox"]({ agentId: "hand" });
	yield* clock.advance(10_000);
	yield* api["mail.markRead"]({ agentId: "hand", ids, requestId: request("read-again") });
	expect(yield* api["mail.unread"]({ agentId: "hand" })).toEqual([carried[1]]);
	yield* rebuild();
	expect(yield* api["mail.mailbox"]({ agentId: "hand" })).toEqual(read);
	expect((yield* mailHistory.read(messageOf("shoal"))).map((event) => event.value._tag)).toEqual(["MessageSent", "MessageDelivered", "MessageRead"]);
});

postgresApp.it("rejects a whole receipt batch when one message is stray", [], function* ({ api, mailHistory, clearPublished, published }) {
	yield* api["mail.send"](sending("shoal"));
	yield* api["mail.send"](sending("channel", "mate"));
	const before = yield* api["mail.mailbox"]({ agentId: "hand" });
	yield* clearPublished();
	for (const [index, ids] of [
		[messageOf("shoal"), messageOf("channel")],
		[messageOf("shoal"), messageOf("missing")],
	].entries()) {
		expect(yield* Effect.flip(api["mail.markDelivered"]({ agentId: "hand", ids, requestId: request(`reject-delivery:${index}`) }))).toMatchObject({
			_tag: "NotAddressed",
			id: ids[1],
		});
		expect(yield* Effect.flip(api["mail.markRead"]({ agentId: "hand", ids, requestId: request(`reject-read:${index}`) }))).toMatchObject({
			_tag: "NotAddressed",
			id: ids[1],
		});
	}
	expect(yield* Effect.flip(api["mail.send"]({ ...sending("blank"), body: " " }))).toMatchObject({ _tag: "Blank", field: "body" });
	expect(yield* api["mail.mailbox"]({ agentId: "hand" })).toEqual(before);
	expect(yield* mailHistory.read(messageOf("shoal"))).toHaveLength(1);
	expect(yield* published()).toEqual([]);
});

postgresApp.it("recognizes a repeated request before validating its new payload", [], function* ({ api, mailHistory, clearPublished, published }) {
	const input = sending("shoal");
	const seq = yield* api["mail.send"](input);
	yield* clearPublished();
	expect(yield* Effect.flip(api["mail.send"]({ ...input, body: "" }))).toMatchObject({ _tag: "AlreadyDone", seq });
	expect(yield* mailHistory.read(messageOf("shoal"))).toHaveLength(1);
	expect(yield* published()).toEqual([]);
});
