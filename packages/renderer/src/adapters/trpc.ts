import type {
	AppInfo,
	EventQuery,
	Fleet,
	RepoRegistration,
	RepoSummary,
	SessionEvent,
	SessionTree,
	SituationDraft,
	SpawnReceipt,
	SpawnRequest,
} from "@antumbra/contract";
import { Data, Effect } from "effect";
import { client, toError } from "#adapters/bridge.ts";

class AppInfoLoadError extends Data.TaggedError("AppInfoLoadError")<{
	readonly message: string;
}> {}

export const loadAppInfo: Effect.Effect<AppInfo, AppInfoLoadError> =
	Effect.tryPromise({
		catch: (cause) => new AppInfoLoadError({ message: String(cause) }),
		try: () => client.appInfo.query(),
	});

export type Unsubscribe = () => void;

export const watchFleet = (
	onFleet: (fleet: Fleet) => void,
	onError: (message: string) => void,
): Unsubscribe => {
	const subscription = client.fleetFeed.subscribe(undefined, {
		onData: onFleet,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const watchSessionEvents = (
	query: EventQuery,
	onEvent: (event: SessionEvent) => void,
	onError: (message: string) => void,
): Unsubscribe => {
	const subscription = client.sessionEventFeed.subscribe(query, {
		onData: onEvent,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const watchSessionTree = (
	rootSessionId: string,
	onTree: (tree: SessionTree) => void,
	onError: (message: string) => void,
): Unsubscribe => {
	const subscription = client.sessionTreeFeed.subscribe(
		{ rootSessionId },
		{
			onData: onTree,
			onError: (cause) => onError(toError(cause).message),
		},
	);
	return () => subscription.unsubscribe();
};

export const spawnAgent = (
	request: SpawnRequest,
	onDone: (receipt: SpawnReceipt) => void,
	onError: (message: string) => void,
): void => {
	client.spawnAgent
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const retireAgent = (
	agentId: string,
	onError: (message: string) => void,
): void => {
	client.retireAgent
		.mutate({ agentId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const retirePieceCrew = (
	pieceId: string,
	onError: (message: string) => void,
): void => {
	client.retirePieceCrew
		.mutate({ pieceId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const interruptSession = (
	sessionId: string,
	onError: (message: string) => void,
): void => {
	client.interruptSession
		.mutate({ sessionId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const sleepSession = (
	sessionId: string,
	onError: (message: string) => void,
): void => {
	client.sleepSession
		.mutate({ sessionId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const sendToSession = (
	sessionId: string,
	text: string,
	onDone: () => void,
	onError: (message: string) => void,
): void => {
	client.sendToSession
		.mutate({ sessionId, text })
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const situationDraft = (
	draft: SituationDraft,
	onDraft: (text: string) => void,
	onError: (message: string) => void,
): void => {
	client.situationDraft
		.query(draft)
		.then(onDraft)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const registerRepo = (
	registration: RepoRegistration,
	onDone: (repo: RepoSummary) => void,
	onError: (message: string) => void,
): void => {
	client.registerRepo
		.mutate(registration)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const forgetRepo = (
	repoId: string,
	onError: (message: string) => void,
): void => {
	client.forgetRepo
		.mutate({ repoId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};
