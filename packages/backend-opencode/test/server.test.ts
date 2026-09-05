import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Logger } from "effect";
import { makeOpencodeServer } from "#server.ts";
import { makeFakeOpencode } from "#test/fake.ts";
import { makeToolSessions } from "#tool-sessions.ts";

it.effect("logs malformed event data through the server's application logger", () =>
	Effect.gen(function* () {
		const logged = yield* Deferred.make<unknown>();
		const logger = Logger.make(({ message }) => Deferred.doneUnsafe(logged, Effect.succeed(message)));
		yield* Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakeOpencode();
				yield* makeOpencodeServer(fake.connect, makeToolSessions([]));
				fake.malformed("data: broken");
				expect(yield* Deferred.await(logged)).toEqual(["opencode: dropped malformed event data", { line: "data: broken" }]);
			}),
		).pipe(Effect.provide(Logger.layer([logger])));
	}),
);
