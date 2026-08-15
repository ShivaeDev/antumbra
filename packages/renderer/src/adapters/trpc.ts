import type {
	AntumbraBridge,
	AppInfo,
	AppRouter,
	EventQuery,
	Fleet,
	SessionEvent,
	SpawnReceipt,
	SpawnRequest,
} from "@antumbra/contract";
import { createTRPCClient, TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { Data, Effect } from "effect";

declare global {
	interface Window {
		readonly antumbra: AntumbraBridge;
	}
}

const toError = (cause: unknown): Error =>
	cause instanceof Error ? cause : new Error(String(cause));

const bridgeLink =
	(): TRPCLink<AppRouter> =>
	() =>
	({ op }) =>
		observable((observer) => {
			if (op.type === "subscription") {
				return window.antumbra.subscribe(
					{ id: crypto.randomUUID(), input: op.input, path: op.path },
					(message) => {
						if (message.type === "data") {
							observer.next({ result: { data: message.data, type: "data" } });
						} else if (message.type === "done") {
							observer.complete();
						} else {
							observer.error(TRPCClientError.from(new Error(message.message)));
						}
					},
				);
			}
			window.antumbra
				.trpc({ input: op.input, path: op.path, type: op.type })
				.then((response) => {
					if (response.ok) {
						observer.next({ result: { data: response.data, type: "data" } });
						observer.complete();
					} else {
						observer.error(
							TRPCClientError.from(
								new Error(`${response.error.code}: ${response.error.message}`),
							),
						);
					}
				})
				.catch((cause: unknown) => {
					observer.error(TRPCClientError.from(toError(cause)));
				});
		});

const client = createTRPCClient<AppRouter>({ links: [bridgeLink()] });

export class AppInfoLoadError extends Data.TaggedError("AppInfoLoadError")<{
	readonly message: string;
}> {}

export const loadAppInfo: Effect.Effect<AppInfo, AppInfoLoadError> =
	Effect.tryPromise({
		catch: (cause) => new AppInfoLoadError({ message: String(cause) }),
		try: () => client.appInfo.query(),
	});

export type Unsubscribe = () => void;

export const watchFleet = (
	onFleet: (fleet: Fleet) => void,
	onError: (message: string) => void,
): Unsubscribe => {
	const subscription = client.fleetFeed.subscribe(undefined, {
		onData: onFleet,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const watchSessionEvents = (
	query: EventQuery,
	onEvent: (event: SessionEvent) => void,
	onError: (message: string) => void,
): Unsubscribe => {
	const subscription = client.sessionEventFeed.subscribe(query, {
		onData: onEvent,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const spawnAgent = (
	request: SpawnRequest,
	onDone: (receipt: SpawnReceipt) => void,
	onError: (message: string) => void,
): void => {
	client.spawnAgent
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const retireAgent = (
	agentId: string,
	onError: (message: string) => void,
): void => {
	client.retireAgent
		.mutate({ agentId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const interruptSession = (
	sessionId: string,
	onError: (message: string) => void,
): void => {
	client.interruptSession
		.mutate({ sessionId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};
