import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";

it.app("committed settings reach both windows and rolled-back settings reach neither", function* ({ host }) {
	const server = yield* host();
	const first = yield* server.window();
	const second = yield* server.window();
	yield* answered(first.api.settings.counts({}), "first window settings");
	yield* answered(second.api.settings.counts({}), "second window settings");
	yield* server.calls["settings.setCount"]({ requestId: Request.make("both-windows"), key: "maxParallelSessions", count: 8 });
	yield* first.count(8);
	yield* second.count(8);
	yield* server.rollbackCount(9);
	expect((yield* server.calls["settings.counts"]({})).find((row) => row.key === "maxParallelSessions")?.count).toBe(8);
	expect(first.seen()).not.toContain(9);
	expect(second.seen()).not.toContain(9);
	yield* first.close;
	yield* second.close;
});

it.app("a resubscribing window rereads changes made while its subscription was closed", function* ({ host }) {
	const server = yield* host();
	const window = yield* server.window();
	yield* answered(window.api.settings.counts({}), "initial settings");
	yield* window.pause;
	yield* server.calls["settings.setCount"]({ requestId: Request.make("while-away"), key: "maxParallelSessions", count: 7 });
	yield* window.resume;
	yield* window.count(7);
	yield* window.close;
});

it.app("image support refreshes when either its session or backend collection commits", function* ({ host }) {
	const server = yield* host();
	const window = yield* server.window();
	const support = yield* window.support("session:input-story");
	yield* support.value(false);
	yield* server.inputSession();
	yield* support.value(true);
	yield* server.capability(false);
	yield* support.value(false);
	yield* window.close;
});
