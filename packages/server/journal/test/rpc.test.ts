import { answered, definition, it } from "@antumbra/app-testing/entry.ts";
import { setCount } from "@antumbra/domain-settings/commands/set-count.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { ClientToken, Unauthorized } from "@antumbra/platform-rpc/token.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Option, Queue, Stream } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";
import { Database } from "#database.ts";

const emissions = Stream.toQueue({ capacity: "unbounded" });

it.app("RPC preserves declared rejection classes", function* (app) {
	const rejection = yield* Effect.flip(app.api.settings.setCount({ key: "maxParallelSessions", count: 100 }));
	expect(rejection).toBeInstanceOf(setCount.Rejection.OutOfRange);
	expect(rejection).toMatchObject({ _tag: "OutOfRange", key: "maxParallelSessions", field: "count" });
});

it.app("RPC carries the original sequence for repeated requests", function* () {
	const calls = yield* RpcTest.makeClient(group(definition.features), { flatten: true });
	const requestId = Id.Request.make("count-change");
	const input = { key: "maxParallelSessions", count: 9, requestId } as const;
	const seq = yield* calls("settings.setCount", input);
	const refused = yield* Effect.flip(calls("settings.setCount", input));
	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(refused).toMatchObject({ requestId, seq });
});

it.app("the client resolves repeated requests without another write", function* (app) {
	const requestId = Id.Request.make("count-change");
	const seq = yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 9, requestId });
	expect(yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 12, requestId })).toBe(seq);
	expect(yield* answered(app.api.settings.counts({}))).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 9 }));
});

it.app("commands without request ids apply independently", function* (app) {
	const database = yield* Database;
	const before = yield* Effect.orDie(database.write`SELECT * FROM "applied"`);
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 9 });
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 12 });
	const applied = yield* Effect.orDie(database.write`SELECT * FROM "applied"`);
	expect(applied.length).toBe(before.length + 2);
	expect(new Set(applied.map((entry) => String(entry.requestId))).size).toBe(applied.length);
	expect(yield* answered(app.api.settings.counts({}))).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 12 }));
});

it.app("RPC queries publish committed changes", function* (app) {
	const seen = yield* emissions(app.api.settings.counts({}));
	expect(yield* Queue.take(seen)).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 4 }));
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 9 });
	expect(yield* Queue.take(seen)).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 9 }));
});

it.app("equal query inputs share an atom with the latest reading", function* (app) {
	const atom = app.api.settings.counts.atom({});
	expect(app.api.settings.counts.atom({})).toBe(atom);
	const seen = yield* emissions(Atom.toStreamResult(atom));
	expect(yield* Queue.take(seen)).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 4 }));
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 9 });
	expect(yield* Queue.take(seen)).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 9 }));
	expect(Option.getOrUndefined(AsyncResult.value(yield* Atom.get(atom)))).toContainEqual(
		expect.objectContaining({ key: "maxParallelSessions", count: 9 }),
	);
});

it.app("RPC refuses a wrong token and accepts the configured token", function* (app) {
	const call = app.api.settings.setCount({ key: "maxParallelSessions", count: 9 });
	const refused = yield* Effect.flip(call.pipe(Effect.provideService(ClientToken, { token: "wrong" })));
	expect(refused).toBeInstanceOf(Unauthorized);
	expect(yield* call).toBeGreaterThan(0);
	expect(yield* answered(app.api.settings.counts({}))).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 9 }));
});
