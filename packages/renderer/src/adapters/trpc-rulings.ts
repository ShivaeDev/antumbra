import type {
	AskMoreRequest,
	OpenRulingsView,
	ParkRequest,
	ProclaimRequest,
	ReclassifyRequest,
	RuleRequest,
	StandingRulingsView,
	SupersedeRequest,
	WithdrawRequest,
} from "@antumbra/contract";
import { Effect } from "effect";
import { client, fired, toError } from "#adapters/bridge.ts";
import { RendererRequestError } from "#adapters/request-error.ts";
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

export const withdrawRuling = Effect.fn("Renderer.withdrawRuling")((request: WithdrawRequest) =>
	Effect.tryPromise({
		try: () => client.withdrawRuling.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const reclassifyRuling = (request: ReclassifyRequest, onError: OnError): void => fired(client.reclassifyRuling.mutate(request), onError);

export const proclaimRuling = (request: ProclaimRequest, onDone: () => void, onError: OnError): void => {
	client.proclaimRuling
		.mutate(request)
		.then(() => onDone())
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const askMoreOnRuling = Effect.fn("Renderer.askMoreOnRuling")((request: AskMoreRequest) =>
	Effect.tryPromise({
		try: () => client.askMoreOnRuling.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const parkRuling = Effect.fn("Renderer.parkRuling")((request: ParkRequest) =>
	Effect.tryPromise({
		try: () => client.parkRuling.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);
