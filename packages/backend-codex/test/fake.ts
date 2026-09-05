import { Effect, Option } from "effect";
import type { LineProcess } from "#adapters/process.ts";

export type FakeAnswer = (method: string, params: unknown) => Option.Option<unknown>;

interface FakeRequest {
	readonly id: number;
	readonly method: string;
	readonly params: unknown;
}

export const askedFor = (fake: FakeAppServer, method: string): unknown => fake.requests.find((request) => request.method === method)?.params;

interface HeldRequest extends FakeRequest {
	readonly accept: () => void;
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
	readonly takeHeldRequest: Effect.Effect<HeldRequest>;
}

interface FakeOptions {
	readonly hold?: string;
	readonly scripted?: FakeAnswer;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const answer = (method: string, params: unknown, nextTurn: () => number): unknown => {
	switch (method) {
		case "initialize":
			return { userAgent: "fake/0.148.0-alpha.9 (test)" };
		case "thread/start":
		case "thread/resume":
			return {
				thread: {
					id: isRecord(params) && typeof params.threadId === "string" ? params.threadId : "thread-1",
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

export const makeFakeAppServer = ({ hold, scripted = () => Option.none() }: FakeOptions = {}): FakeAppServer => {
	let lineListener: ((line: string) => void) | null = null;
	const exitListeners: Array<(code: number | null) => void> = [];
	const emitExit = (code: number | null): void => {
		for (const listener of exitListeners) {
			listener(code);
		}
	};
	let turnCounter = 0;
	const nextTurn = () => {
		turnCounter += 1;
		return turnCounter;
	};
	const requests: FakeRequest[] = [];
	const responses: FakeResponse[] = [];
	const pendingHeldRequests: HeldRequest[] = [];
	const heldRequestWaiters: Array<(request: HeldRequest) => void> = [];
	const responseWaiters = new Map<number | string, Array<(result: unknown) => void>>();
	const takeHeldRequest = Effect.promise(() => {
		const request = pendingHeldRequests.shift();
		if (request !== undefined) {
			return Promise.resolve(request);
		}
		return new Promise<HeldRequest>((resolve) => {
			heldRequestWaiters.push(resolve);
		});
	});
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
	const send = (message: Record<string, unknown>) => lineListener?.(JSON.stringify({ jsonrpc: "2.0", ...message }));
	const publishHeldRequest = (request: HeldRequest): void => {
		const resolve = heldRequestWaiters.shift();
		if (resolve !== undefined) {
			resolve(request);
			return;
		}
		pendingHeldRequests.push(request);
	};
	const receiveRequest = (request: FakeRequest): void => {
		requests.push(request);
		const result = Option.getOrElse(scripted(request.method, request.params), () => answer(request.method, request.params, nextTurn));
		if (request.method === hold) {
			publishHeldRequest({ ...request, accept: () => send({ id: request.id, result }) });
			return;
		}
		queueMicrotask(() => send({ id: request.id, result }));
	};
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
		receiveRequest({ id, method, params });
	};
	const process: LineProcess = {
		kill: () => {
			emitExit(0);
		},
		onExit: (listener) => {
			exitListeners.push(listener);
		},
		onLine: (listener) => {
			lineListener = listener;
		},
		onStderr: () => {},
		write: receive,
	};
	return {
		exit: () => emitExit(1),
		notify: (method, params) => send({ method, params }),
		process,
		requests,
		responseById,
		serverRequest: (id, method, params) => send({ id, method, params }),
		takeHeldRequest,
	};
};
