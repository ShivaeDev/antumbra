import type { OpencodeEventListeners } from "@antumbra/runner-backends-opencode/connection.ts";
import { openSseBuffer } from "@antumbra/runner-backends-opencode/sse.ts";

interface EventStreamListeners extends OpencodeEventListeners {
	readonly onEnd: () => void;
}

export const openEventStream = (address: string, listeners: EventStreamListeners): (() => void) => {
	const controller = new AbortController();
	const read = async (): Promise<void> => {
		const response = await fetch(address, {
			signal: controller.signal,
		});
		if (response.body === null) {
			return;
		}
		const buffer = openSseBuffer(listeners.onMalformed);
		const decoder = new TextDecoder();
		for await (const chunk of response.body) {
			for (const frame of buffer.take(decoder.decode(chunk, { stream: true }))) {
				listeners.onFrame(frame);
			}
		}
	};
	void read()
		.catch(() => {})
		.finally(listeners.onEnd);
	return () => controller.abort();
};
