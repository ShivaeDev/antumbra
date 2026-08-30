// why: opencode frames its event stream as server-sent events, one JSON object
// per `data:` line. Nothing here needs the id or retry fields the format also
// allows, and a line that is not JSON is dropped rather than taking the stream
// down — the record's own answer to an unreadable frame is that it saw none.
export const dataFrames = (chunk: string): unknown[] =>
	chunk
		.split("\n")
		.flatMap((line) => (line.startsWith("data:") ? [line.slice(5)] : []))
		.flatMap((payload) => {
			try {
				const frame: unknown = JSON.parse(payload);
				return [frame];
			} catch {
				return [];
			}
		});

export interface SseBuffer {
	readonly take: (chunk: string) => unknown[];
}

// why: a chunk off the socket is not a line — a frame can be split across two
// reads — so the tail is held until its newline arrives.
export const openSseBuffer = (): SseBuffer => {
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
			return dataFrames(complete);
		},
	};
};
