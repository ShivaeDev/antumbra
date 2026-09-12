import { it } from "@antumbra/app-testing/entry.ts";
import { mailbox } from "@antumbra/domain-mail/queries/mailbox.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Latch } from "effect";
import { expect } from "vitest";

it.app("live queries refresh only for their scope", function* (app) {
	const live = yield* app.live(mailbox, { agentId: "agent-1" });
	yield* app.settle();
	const before = yield* live.seen;
	expect(before).toHaveLength(1);
	const posted = { authorAgentId: null, precedence: "routine" } as const;
	yield* app.api.mail.send({ ...posted, requestId: Id.Request.make("elsewhere"), toAgentId: "agent-2", body: "Elsewhere" });
	yield* app.settle();
	expect(yield* live.seen).toEqual(before);
	yield* app.api.mail.send({ ...posted, requestId: Id.Request.make("addressed"), toAgentId: "agent-1", body: "Addressed" });
	yield* app.settle();
	expect((yield* live.seen).at(-1)).toContainEqual(expect.objectContaining({ toAgentId: "agent-1", body: "Addressed" }));
});

it.app("coalesces commits while a query is reading", function* (app) {
	const reading = yield* Latch.make(false);
	const release = yield* Latch.make(false);
	const held: typeof counts = {
		...counts,
		run: (input, rows) =>
			Effect.gen(function* () {
				yield* reading.open;
				yield* release.await;
				return yield* counts.run(input, rows, {});
			}),
	};
	const live = yield* app.live(held, {});
	yield* reading.await;
	for (const count of [9, 10, 11, 12, 13]) {
		yield* app.commit.settings.setCount({ key: "maxParallelSessions", count });
	}
	yield* release.open;
	yield* app.settle();
	const seen = yield* live.seen;
	expect(seen).toHaveLength(2);
	expect(seen.at(-1)).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 13 }));
});
