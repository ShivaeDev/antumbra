import type { AdoptChangeRequest, QuayView } from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

type OnError = (message: string) => void;

// why: the feed opens with what is at the quay now and stays current after —
// a window that reloads rehydrates from it rather than asking twice.
export const watchQuay = (
	onQuay: (quay: QuayView) => void,
	onError: OnError,
): Unsubscribe => {
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

// why: the verdict on a change that died at its host. It leaves the quay on
// the next feed rather than on the click, because what lies at the quay is the
// domain's reading and never the window's guess about it.
export const dismissChange = (changeId: string, onError: OnError): void => {
	client.dismissChange
		.mutate({ changeId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const adoptChange = (
	request: AdoptChangeRequest,
	onDone: () => void,
	onError: OnError,
): void => {
	client.adoptChange
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};
