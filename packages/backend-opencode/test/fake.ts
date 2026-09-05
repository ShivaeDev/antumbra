import type { OpencodeConnection, OpencodeEventListeners, OpencodeRequest } from "#adapters/connection.ts";
import { SESSION } from "#test/frames.ts";
import { PROVIDERS } from "#test/providers.ts";

interface FakeCall {
	readonly body: unknown;
	readonly path: string;
	readonly query: Readonly<Record<string, string>>;
}

export interface FakeOpencode {
	readonly calls: FakeCall[];
	readonly connect: () => Promise<OpencodeConnection>;
	readonly emit: (frame: unknown) => void;
	readonly malformed: (line: string) => void;
	readonly exit: () => void;
}

const answer = (path: string): unknown => {
	if (path === "/config/providers") {
		return PROVIDERS;
	}
	if (path === "/session") {
		return { directory: "/moorage", id: SESSION };
	}
	if (path.endsWith("/prompt_async")) {
		return undefined;
	}
	if (path.endsWith("/abort")) {
		return true;
	}
	return { directory: "/moorage", id: path.slice("/session/".length) };
};

export const makeFakeOpencode = (): FakeOpencode => {
	const calls: FakeCall[] = [];
	let listeners: OpencodeEventListeners | undefined;
	let exitListener: (() => void) | null = null;
	const record = (request: OpencodeRequest): Promise<unknown> => {
		const call: FakeCall = { ...request };
		calls.push(call);
		return Promise.resolve(answer(call.path));
	};
	return {
		calls,
		connect: () =>
			Promise.resolve({
				close: () => exitListener?.(),
				get: record,
				onEvent: (onEvent) => {
					listeners = onEvent;
				},
				onExit: (listener) => {
					exitListener = listener;
				},
				post: record,
			}),
		emit: (frame) => listeners?.onFrame(frame),
		malformed: (line) => listeners?.onMalformed(line),
		exit: () => exitListener?.(),
	};
};
