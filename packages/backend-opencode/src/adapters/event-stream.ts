import { basicAuth } from "#adapters/http.ts";
import { openSseBuffer } from "#adapters/sse.ts";

export interface EventStreamListeners {
	readonly onEnd: () => void;
	readonly onFrame: (frame: unknown) => void;
}

// why: one subscription to the host-wide stream, taken before any session
// exists so nothing a session is told about it can arrive before somebody is
// listening. The returned handle stops the read; the stream ending for any
// other reason is the server going away, which every session must hear.
export const openEventStream = (
	address: string,
	password: string,
	listeners: EventStreamListeners,
): (() => void) => {
	const controller = new AbortController();
	const read = async (): Promise<void> => {
		const response = await fetch(address, {
			headers: { authorization: basicAuth(password) },
			signal: controller.signal,
		});
		if (response.body === null) {
			return;
		}
		const buffer = openSseBuffer();
		const decoder = new TextDecoder();
		for await (const chunk of response.body) {
			for (const frame of buffer.take(
				decoder.decode(chunk, { stream: true }),
			)) {
				listeners.onFrame(frame);
			}
		}
	};
	void read()
		.catch(() => {})
		.finally(listeners.onEnd);
	return () => controller.abort();
};
