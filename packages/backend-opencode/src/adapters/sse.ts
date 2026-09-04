import { Effect, Option, Schema } from "effect";

const decodeFrame = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const dataFrames = (chunk: string) =>
	Effect.gen(function* () {
		const frames: unknown[] = [];
		for (const line of chunk.split("\n")) {
			if (!line.startsWith("data:")) {
				continue;
			}
			const frame = decodeFrame(line.slice(5));
			if (Option.isSome(frame)) {
				frames.push(frame.value);
			} else {
				yield* Effect.logWarning("opencode: dropped malformed event data", { line });
			}
		}
		return frames;
	});

interface SseBuffer {
	readonly take: (chunk: string) => Effect.Effect<unknown[]>;
}

export const openSseBuffer = (): SseBuffer => {
	let pending = "";
	return {
		take: (chunk) =>
			Effect.suspend(() => {
				pending += chunk;
				const boundary = pending.lastIndexOf("\n");
				if (boundary < 0) {
					return Effect.succeed([]);
				}
				const complete = pending.slice(0, boundary);
				pending = pending.slice(boundary + 1);
				return dataFrames(complete);
			}),
	};
};
