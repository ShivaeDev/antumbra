import { Option, Schema } from "effect";

const decodeFrame = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const dataFrames = (chunk: string, onMalformed: (line: string) => void): unknown[] => {
	const frames: unknown[] = [];
	for (const line of chunk.split("\n")) {
		if (!line.startsWith("data:")) {
			continue;
		}
		const frame = decodeFrame(line.slice(5));
		if (Option.isSome(frame)) {
			frames.push(frame.value);
		} else {
			onMalformed(line);
		}
	}
	return frames;
};

interface SseBuffer {
	readonly take: (chunk: string) => unknown[];
}

export const openSseBuffer = (onMalformed: (line: string) => void): SseBuffer => {
	let pending = "";
	return {
		take: (chunk) => {
			pending += chunk;
			const boundary = pending.lastIndexOf("\n");
			if (boundary < 0) {
				return [];
			}
			const complete = pending.slice(0, boundary);
			pending = pending.slice(boundary + 1);
			return dataFrames(complete, onMalformed);
		},
	};
};
