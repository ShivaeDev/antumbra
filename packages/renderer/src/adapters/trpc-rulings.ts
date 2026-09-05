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
import { client, toError } from "#adapters/bridge.ts";
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

export const ruleOn = Effect.fn("Renderer.ruleOn")((request: RuleRequest) =>
	Effect.tryPromise({
		try: () => client.ruleOn.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const watchStandingRulings = (onRulings: (rulings: StandingRulingsView) => void, onError: OnError): Unsubscribe => {
	const subscription = client.standingRulingsFeed.subscribe(undefined, {
		onData: onRulings,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const supersedeRuling = Effect.fn("Renderer.supersedeRuling")((request: SupersedeRequest) =>
	Effect.tryPromise({
		try: () => client.supersedeRuling.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const withdrawRuling = Effect.fn("Renderer.withdrawRuling")((request: WithdrawRequest) =>
	Effect.tryPromise({
		try: () => client.withdrawRuling.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const reclassifyRuling = Effect.fn("Renderer.reclassifyRuling")((request: ReclassifyRequest) =>
	Effect.tryPromise({
		try: () => client.reclassifyRuling.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const proclaimRuling = Effect.fn("Renderer.proclaimRuling")((request: ProclaimRequest) =>
	Effect.tryPromise({
		try: () => client.proclaimRuling.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

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
