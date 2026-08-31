import { Result } from "effect";

const PREFIX = "antumbra:session-draft:v1:";

export type SessionDraftSlot = "message" | `situation:${string}:${string}`;

export interface SessionDraftRef {
	readonly sessionId: string;
	readonly slot: SessionDraftSlot;
}

const safely = <A>(evaluate: () => A, fallback: A): A => Result.getOrElse(Result.try(evaluate), () => fallback);

const browserStorage = (): Storage | undefined => safely(() => window.localStorage, undefined);

export const draftStorageKey = (draft: SessionDraftRef): string =>
	`${PREFIX}${encodeURIComponent(draft.sessionId)}/${encodeURIComponent(draft.slot)}`;

export const readStoredDraft = (key: string): string => safely(() => browserStorage()?.getItem(key) ?? "", "");

export const writeStoredDraft = (key: string, text: string): void => {
	safely(() => {
		if (text === "") {
			browserStorage()?.removeItem(key);
		} else {
			browserStorage()?.setItem(key, text);
		}
	}, undefined);
};

export const storedDraftKeys = (): ReadonlyArray<string> => {
	const storage = browserStorage();
	if (storage === undefined) {
		return [];
	}
	return safely(() => Array.from({ length: storage.length }, (_, index) => storage.key(index)).flatMap((key) => (key === null ? [] : [key])), []);
};

export const sessionIdFromDraftKey = (key: string): string | undefined => {
	if (!key.startsWith(PREFIX)) {
		return undefined;
	}
	const separator = key.indexOf("/", PREFIX.length);
	if (separator < 0) {
		return undefined;
	}
	return safely(() => decodeURIComponent(key.slice(PREFIX.length, separator)), undefined);
};
