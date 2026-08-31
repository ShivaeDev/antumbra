import type { EventQuery, Fleet, SessionEvent, SessionTree } from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";

export type Unsubscribe = () => void;

export const watchFleet = (onFleet: (fleet: Fleet) => void, onError: (message: string) => void): Unsubscribe => {
	const subscription = client.fleetFeed.subscribe(undefined, {
		onData: onFleet,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const watchSessionEvents = (query: EventQuery, onEvent: (event: SessionEvent) => void, onError: (message: string) => void): Unsubscribe => {
	const subscription = client.sessionEventFeed.subscribe(query, {
		onData: onEvent,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const watchSessionTree = (rootSessionId: string, onTree: (tree: SessionTree) => void, onError: (message: string) => void): Unsubscribe => {
	const subscription = client.sessionTreeFeed.subscribe(
		{ rootSessionId },
		{
			onData: onTree,
			onError: (cause) => onError(toError(cause).message),
		},
	);
	return () => subscription.unsubscribe();
};
