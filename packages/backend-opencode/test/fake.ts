import { Effect } from "effect";
import type { OpencodeConnection, OpencodeRequest } from "#adapters/connection.ts";
import { SESSION } from "#test/frames.ts";

export interface FakeCall {
	readonly body: unknown;
	readonly path: string;
	readonly query: Readonly<Record<string, string>>;
}

export interface FakeOpencode {
	readonly calls: FakeCall[];
	readonly connect: () => Promise<OpencodeConnection>;
	readonly called: (path: string) => Effect.Effect<FakeCall>;
	readonly emit: (frame: unknown) => void;
	readonly exit: () => void;
}

const answer = (path: string): unknown => {
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
	const waiting = new Map<string, Array<(call: FakeCall) => void>>();
	let frameListener: ((frame: unknown) => void) | null = null;
	let exitListener: (() => void) | null = null;
	const record = (request: OpencodeRequest): Promise<unknown> => {
		const call: FakeCall = { ...request };
		calls.push(call);
		for (const resolve of waiting.get(call.path) ?? []) {
			resolve(call);
		}
		waiting.delete(call.path);
		return Promise.resolve(answer(call.path));
	};
	return {
		called: (path) =>
			Effect.promise(() => {
				const seen = calls.find((call) => call.path === path);
				if (seen !== undefined) {
					return Promise.resolve(seen);
				}
				return new Promise<FakeCall>((resolve) => {
					waiting.set(path, [...(waiting.get(path) ?? []), resolve]);
				});
			}),
		calls,
		connect: () =>
			Promise.resolve({
				close: () => exitListener?.(),
				get: record,
				onEvent: (listener) => {
					frameListener = listener;
				},
				onExit: (listener) => {
					exitListener = listener;
				},
				post: record,
			}),
		emit: (frame) => frameListener?.(frame),
		exit: () => exitListener?.(),
	};
};
