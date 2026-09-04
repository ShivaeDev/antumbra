import { expect, it } from "@effect/vitest";
import { Effect, Logger } from "effect";
import { listeningUrl } from "#adapters/listening.ts";
import { openSseBuffer } from "#adapters/sse.ts";

it("reads the address out of the line the server announces it on", () => {
	expect(listeningUrl("     opencode server listening on http://127.0.0.1:51491\n")).toBe("http://127.0.0.1:51491");
	expect(listeningUrl("all LSPs are disabled")).toBeUndefined();
});

it.effect("holds a frame split across two reads until its newline arrives", () =>
	Effect.gen(function* () {
		const buffer = openSseBuffer();
		expect(yield* buffer.take('data: {"payload":{"type":"ses')).toEqual([]);
		expect(yield* buffer.take('sion.idle"}}\n\n')).toEqual([{ payload: { type: "session.idle" } }]);
	}),
);

it.effect("delivers valid frames on both sides of a malformed data line", () =>
	Effect.gen(function* () {
		const logs: unknown[] = [];
		const logger = Logger.make(({ message }) => logs.push(message));
		const buffer = openSseBuffer();
		expect(yield* buffer.take('data: {"first":1}\ndata: broken\ndata: {"second":2}\n').pipe(Effect.provide(Logger.layer([logger])))).toEqual([
			{ first: 1 },
			{ second: 2 },
		]);
		expect(logs).toEqual([["opencode: dropped malformed event data", { line: "data: broken" }]]);
	}),
);
