export const dataFrames = (chunk: string): unknown[] =>
	chunk
		.split("\n")
		.flatMap((line) => (line.startsWith("data:") ? [line.slice(5)] : []))
		.map((payload) => {
			const frame: unknown = JSON.parse(payload);
			return frame;
		});

export interface SseBuffer {
	readonly take: (chunk: string) => unknown[];
}

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
