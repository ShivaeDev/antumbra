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

export const watchStandingRulings = (
	onRulings: (rulings: StandingRulingsView) => void,
	onError: OnError,
): Unsubscribe => {
	const subscription = client.standingRulingsFeed.subscribe(undefined, {
		onData: onRulings,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

// why: a superseded ruling leaves the standing set on the next feed for the
// same reason a ruled one leaves the open set — what stands is the record's
// reading, never the window's guess.
export const supersedeRuling = (
	request: SupersedeRequest,
	onError: OnError,
): void => fired(client.supersedeRuling.mutate(request), onError);

// why: a withdrawn ruling leaves the standing set on the next feed like a
// superseded one, and the words that retired it go with the act rather than
// waiting for the window to ask what to store beside it.
export const withdrawRuling = (
	request: WithdrawRequest,
	onError: OnError,
): void => fired(client.withdrawRuling.mutate(request), onError);

// why: the reclassified axes reach the card on the next feed, because where a
// ruling now sits in the open set is the record's reading, not the window's.
export const reclassifyRuling = (
	request: ReclassifyRequest,
	onError: OnError,
): void => fired(client.reclassifyRuling.mutate(request), onError);

// why: a proclamation is asked and answered in one act, so it never joins the
// open set — it reaches the window on the standing feed the moment it lands.
export const proclaimRuling = (
	request: ProclaimRequest,
	onError: OnError,
): void => fired(client.proclaimRuling.mutate(request), onError);
