import { openSseBuffer } from "#adapters/sse.ts";

export interface EventStreamListeners {
	readonly onEnd: () => void;
	readonly onFrame: (frame: unknown) => void;
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
		const buffer = openSseBuffer();
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
