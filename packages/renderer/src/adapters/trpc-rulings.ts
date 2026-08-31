import type {
	OpenRulingsView,
	ProclaimRequest,
	ReclassifyRequest,
	RuleRequest,
	StandingRulingsView,
	SupersedeRequest,
	WithdrawRequest,
} from "@antumbra/contract";
import { client, fired, toError } from "#adapters/bridge.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

type OnError = (message: string) => void;

export const watchOpenRulings = (onRulings: (rulings: OpenRulingsView) => void, onError: OnError): Unsubscribe => {
	const subscription = client.openRulingsFeed.subscribe(undefined, {
		onData: onRulings,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const ruleOn = (request: RuleRequest, onError: OnError): void => fired(client.ruleOn.mutate(request), onError);

export const watchStandingRulings = (onRulings: (rulings: StandingRulingsView) => void, onError: OnError): Unsubscribe => {
	const subscription = client.standingRulingsFeed.subscribe(undefined, {
		onData: onRulings,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const supersedeRuling = (request: SupersedeRequest, onError: OnError): void => fired(client.supersedeRuling.mutate(request), onError);

export const withdrawRuling = (request: WithdrawRequest, onError: OnError): void => fired(client.withdrawRuling.mutate(request), onError);

export const reclassifyRuling = (request: ReclassifyRequest, onError: OnError): void => fired(client.reclassifyRuling.mutate(request), onError);

export const proclaimRuling = (request: ProclaimRequest, onError: OnError): void => fired(client.proclaimRuling.mutate(request), onError);
