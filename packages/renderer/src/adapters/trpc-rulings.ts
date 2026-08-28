import type { OpenRulingsView, RuleRequest } from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

type OnError = (message: string) => void;

const fired = (acted: Promise<unknown>, onError: OnError): void => {
	acted
		.then(() => undefined)
		.catch((cause: unknown) => {
			onError(toError(cause).message);
		});
};

// why: the feed opens with every ruling still open and stays current after, so
// a window that reloads rehydrates from it rather than asking twice.
export const watchOpenRulings = (
	onRulings: (rulings: OpenRulingsView) => void,
	onError: OnError,
): Unsubscribe => {
	const subscription = client.openRulingsFeed.subscribe(undefined, {
		onData: onRulings,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

// why: a ruled ruling leaves the open set on the next feed rather than on the
// click, because what is still open is the record's reading and never the
// window's guess about it.
export const ruleOn = (request: RuleRequest, onError: OnError): void =>
	fired(client.ruleOn.mutate(request), onError);
