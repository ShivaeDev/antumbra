import type { StoredEvent } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, PubSub } from "effect";
import { makeEventSinkFactory } from "#events.ts";
import { acquireTemporaryPersistence, rawOf } from "#test/harness.ts";

it.live("two sinks append unique contiguous session event sequences", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.SessionEvent.create({
					kind: "message",
					payload: JSON.stringify({
						raw: rawOf("seed"),
						role: "agent",
						text: "seed",
						type: "message",
					}),
					seq: 0,
					sessionId: "session-sequence",
				}),
			);
			const feed = yield* PubSub.unbounded<StoredEvent>();
			const sinkFor = yield* makeEventSinkFactory(feed);
			const [first, second] = yield* Effect.all([
				sinkFor("session-sequence"),
				sinkFor("session-sequence"),
			]);
			yield* Effect.all(
				[
					first({
						raw: rawOf("first"),
						role: "agent",
						text: "first",
						type: "message",
					}),
					second({
						raw: rawOf("second"),
						role: "agent",
						text: "second",
						type: "message",
					}),
				],
				{ concurrency: "unbounded" },
			);
			const events = yield* db.SessionEvent.where({
				sessionId: "session-sequence",
			})
				.orderBy((event) => event.seq.asc())
				.all();
			expect(events.map((event) => event.seq)).toEqual([0, 1, 2]);
			expect(events.slice(1).map((event) => event.kind)).toEqual([
				"message",
				"message",
			]);
		}).pipe(Effect.provide(temporary.layer));
	}),
);

it.live("an opening event is not acknowledged without a durable Session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const feed = yield* PubSub.unbounded<StoredEvent>();
			const sinkFor = yield* makeEventSinkFactory(feed);
			const sink = yield* sinkFor("session-missing");
			expect(
				yield* sink({
					nativeRef: "native-orphan",
					raw: rawOf("session/opened"),
					type: "session.opened",
				}),
			).toBe(false);
			expect(
				yield* db.SessionEvent.where({ sessionId: "session-missing" }).all(),
			).toEqual([]);
		}).pipe(Effect.provide(temporary.layer));
	}),
);
