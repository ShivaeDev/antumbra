import type { AdoptChangeRequest, QuayView } from "@antumbra/contract";
import { Effect } from "effect";
import { client, toError } from "#adapters/bridge.ts";
import { RendererRequestError } from "#adapters/request-error.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

type OnError = (message: string) => void;

export const watchQuay = (onQuay: (quay: QuayView) => void, onError: OnError): Unsubscribe => {
	const subscription = client.quayFeed.subscribe(undefined, {
		onData: onQuay,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const refreshChanges = (onDone: () => void, onError: OnError): void => {
	client.refreshChanges
		.mutate()
		.then(onDone)
		.catch((cause: unknown) => {
			onDone();
			onError(toError(cause).message);
		});
};

export const dismissChange = (changeId: string, onError: OnError): void => {
	client.dismissChange
		.mutate({ changeId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const adoptChange = Effect.fn("Renderer.adoptChange")((request: AdoptChangeRequest) =>
	Effect.tryPromise({
		try: () => client.adoptChange.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);
