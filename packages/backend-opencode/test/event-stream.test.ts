import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, vi } from "vitest";
import { openEventStream } from "#adapters/event-stream.ts";

afterEach(() => vi.unstubAllGlobals());

it.live("delivers both events when malformed data arrives between stream reads", () =>
	Effect.gen(function* () {
		const encoder = new TextEncoder();
		const body = new ReadableStream<Uint8Array>({
			start: (controller) => {
				for (const line of ['data: {"first":1}\n', "data: broken\n", 'data: {"second":2}\n']) {
					controller.enqueue(encoder.encode(line));
				}
				controller.close();
			},
		});
		vi.stubGlobal("fetch", () => Promise.resolve(new Response(body)));
		const frames: unknown[] = [];
		yield* Effect.promise(
			() =>
				new Promise<void>((resolve) => {
					openEventStream("http://opencode/global/event", { onEnd: resolve, onFrame: (frame) => frames.push(frame) });
				}),
		);
		expect(frames).toEqual([{ first: 1 }, { second: 2 }]);
	}),
);
