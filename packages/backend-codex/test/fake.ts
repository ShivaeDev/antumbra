import { Effect, Option } from "effect";
import type { LineProcess } from "#adapters/process.ts";

// why: a test that needs codex to say something the standing answers do not
// cover writes that one answer and nothing else. `None` falls through, so the
// rest of the client keeps being exercised against the same fake every other
// test uses rather than a second one written beside it.
export type FakeAnswer = (
	method: string,
	params: unknown,
) => Option.Option<unknown>;

export interface FakeRequest {
	readonly id: number;
	readonly method: string;
	readonly params: unknown;
}

interface FakeResponse {
	readonly id: number | string;
	readonly result: unknown;
}

export interface FakeAppServer {
	readonly exit: () => void;
	readonly notify: (method: string, params: unknown) => void;
	readonly process: LineProcess;
	readonly requests: FakeRequest[];
	readonly responseById: (id: number | string) => Effect.Effect<unknown>;
	readonly serverRequest: (id: number, method: string, params: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

// why: an in-memory app-server that answers the handful of requests the
// backend makes, so the whole client — rpc, server, thread, turn driver —
// is exercised without the codex binary. Turn ids count up per thread.
const answer = (
	method: string,
	params: unknown,
	nextTurn: () => number,
): unknown => {
	switch (method) {
		case "initialize":
			return { userAgent: "fake/0.148.0-alpha.9 (test)" };
		case "thread/start":
		case "thread/resume":
			return {
				thread: {
					id:
						isRecord(params) && typeof params.threadId === "string"
							? params.threadId
							: "thread-1",
				},
			};
		case "turn/start":
			return {
				turn: { id: `turn-${nextTurn()}`, items: [], status: "inProgress" },
			};
		case "turn/steer":
			return { turnId: isRecord(params) ? params.expectedTurnId : "" };
		default:
			return {};
	}
};

export const makeFakeAppServer = (
	scripted: FakeAnswer = () => Option.none(),
): FakeAppServer => {
	let lineListener: ((line: string) => void) | null = null;
	let exitListener: ((code: number | null) => void) | null = null;
	let turnCounter = 0;
	const nextTurn = () => {
		turnCounter += 1;
		return turnCounter;
	};
	const requests: FakeRequest[] = [];
	const responses: FakeResponse[] = [];
	const responseWaiters = new Map<
		number | string,
		Array<(result: unknown) => void>
	>();
	const responseById = (id: number | string) =>
		Effect.promise(() => {
			const response = responses.find((candidate) => candidate.id === id);
			if (response !== undefined) {
				return Promise.resolve(response.result);
			}
			return new Promise<unknown>((resolve) => {
				const waiting = responseWaiters.get(id) ?? [];
				waiting.push(resolve);
				responseWaiters.set(id, waiting);
			});
		});
	const send = (message: Record<string, unknown>) =>
		lineListener?.(JSON.stringify({ jsonrpc: "2.0", ...message }));
	const receive = (line: string): void => {
		const message: unknown = JSON.parse(line);
		if (!isRecord(message)) {
			return;
		}
		const { id, method, params } = message;
		if (typeof method !== "string") {
			if (typeof id === "number" || typeof id === "string") {
				responses.push({ id, result: message.result });
				for (const resolve of responseWaiters.get(id) ?? []) {
					resolve(message.result);
				}
				responseWaiters.delete(id);
			}
			return;
		}
		if (typeof id !== "number") {
			return;
		}
		requests.push({ id, method, params });
		queueMicrotask(() => {
			send({
				id,
				result: Option.getOrElse(scripted(method, params), () =>
					answer(method, params, nextTurn),
				),
			});
		});
	};
	const process: LineProcess = {
		kill: () => {
			exitListener?.(0);
		},
		onExit: (listener) => {
			exitListener = listener;
		},
		onLine: (listener) => {
			lineListener = listener;
		},
		onStderr: () => {},
		write: receive,
	};
	return {
		exit: () => exitListener?.(1),
		notify: (method, params) => send({ method, params }),
		process,
		requests,
		responseById,
		serverRequest: (id, method, params) => send({ id, method, params }),
	};
};
