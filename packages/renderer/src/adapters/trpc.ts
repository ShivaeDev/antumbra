import type {
	AppInfo,
	RepoRegistration,
	RepoSummary,
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

export {
	type Unsubscribe,
	watchFleet,
	watchSessionEvents,
	watchSessionTree,
} from "#adapters/trpc-watches.ts";

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
