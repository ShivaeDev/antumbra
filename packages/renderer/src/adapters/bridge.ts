import type { AntumbraBridge, AppRouter, SubscriptionMessage, TrpcResponse } from "@antumbra/contract";
import { createTRPCClient, TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";

declare global {
	interface Window {
		readonly antumbra: AntumbraBridge;
	}
}

export const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

export const fired = (acted: Promise<unknown>, onError: (message: string) => void): void => {
	acted
		.then(() => undefined)
		.catch((cause: unknown) => {
			onError(toError(cause).message);
		});
};

export const openExternal = (url: string): void => {
	window.antumbra.openExternal(url);
};

interface LinkObserver {
	readonly complete: () => void;
	readonly error: (error: TRPCClientError<AppRouter>) => void;
	readonly next: (value: { result: { data: unknown; type: "data" } }) => void;
}

const deliverMessage = (observer: LinkObserver, message: SubscriptionMessage): void => {
	if (message.type === "data") {
		observer.next({ result: { data: message.data, type: "data" } });
		return;
	}
	if (message.type === "done") {
		observer.complete();
		return;
	}
	observer.error(TRPCClientError.from(new Error(message.message)));
};

const deliverResponse = (observer: LinkObserver, response: TrpcResponse): void => {
	if (response.ok) {
		observer.next({ result: { data: response.data, type: "data" } });
		observer.complete();
		return;
	}
	observer.error(TRPCClientError.from(new Error(`${response.error.code}: ${response.error.message}`)));
};

const bridgeLink =
	(): TRPCLink<AppRouter> =>
	() =>
	({ op }) =>
		observable((observer) => {
			if (op.type === "subscription") {
				return window.antumbra.subscribe({ id: crypto.randomUUID(), input: op.input, path: op.path }, (message) => deliverMessage(observer, message));
			}
			window.antumbra
				.trpc({ input: op.input, path: op.path, type: op.type })
				.then((response) => deliverResponse(observer, response))
				.catch((cause: unknown) => observer.error(TRPCClientError.from(toError(cause))));
		});

export const client = createTRPCClient<AppRouter>({ links: [bridgeLink()] });
