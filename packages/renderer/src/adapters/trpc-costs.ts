import type { CostsView } from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

export const watchCosts = (onCosts: (costs: CostsView) => void, onError: (message: string) => void): Unsubscribe => {
	const subscription = client.costsFeed.subscribe(undefined, {
		onData: onCosts,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};
