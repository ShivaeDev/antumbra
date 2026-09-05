import type { HoldsView } from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

export const watchHolds = (onHolds: (holds: HoldsView) => void, onError: (message: string) => void): Unsubscribe => {
	const subscription = client.holdsFeed.subscribe(undefined, {
		onData: onHolds,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};
