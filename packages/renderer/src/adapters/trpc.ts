import type { AppInfo, ModelChoice, RepoRegistration, RepoSummary, SituationDraft, SpawnReceipt, SpawnRequest } from "@antumbra/contract";
import { Data, Effect } from "effect";
import { client, fired, toError } from "#adapters/bridge.ts";

export {
	interruptSession,
	loadSessionImage,
	sendSessionInput,
	sendToSession,
	sleepSession,
} from "#adapters/trpc-session.ts";
export {
	type Unsubscribe,
	watchFleet,
	watchSessionEvents,
	watchSessionTree,
} from "#adapters/trpc-watches.ts";

class AppInfoLoadError extends Data.TaggedError("AppInfoLoadError")<{
	readonly message: string;
}> {}

export const loadAppInfo: Effect.Effect<AppInfo, AppInfoLoadError> = Effect.tryPromise({
	catch: (cause) => new AppInfoLoadError({ message: String(cause) }),
	try: () => client.appInfo.query(),
});

export const backendModels = (backend: string, onModels: (models: ReadonlyArray<ModelChoice>) => void, onError: (message: string) => void): void => {
	client.backendModels
		.query({ backend })
		.then(onModels)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const restartApp = (onError: (message: string) => void): void => fired(client.restart.mutate(), onError);

export const spawnAgent = (request: SpawnRequest, onDone: (receipt: SpawnReceipt) => void, onError: (message: string) => void): void => {
	client.spawnAgent
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const retireAgent = (agentId: string, onError: (message: string) => void): void => {
	client.retireAgent
		.mutate({ agentId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const retirePieceCrew = (pieceId: string, onError: (message: string) => void): void => {
	client.retirePieceCrew
		.mutate({ pieceId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const retryBackend = (backend: string, onError: (message: string) => void): void => {
	client.retryBackend
		.mutate({ backend })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const situationDraft = (draft: SituationDraft, onDraft: (text: string) => void, onError: (message: string) => void): void => {
	client.situationDraft
		.query(draft)
		.then(onDraft)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const registerRepo = (registration: RepoRegistration, onDone: (repo: RepoSummary) => void, onError: (message: string) => void): void => {
	client.registerRepo
		.mutate(registration)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const forgetRepo = (repoId: string, onError: (message: string) => void): void => {
	client.forgetRepo
		.mutate({ repoId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};
