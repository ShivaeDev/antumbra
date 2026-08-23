import {
	draftStorageKey,
	readStoredDraft,
	type SessionDraftRef,
	sessionIdFromDraftKey,
	storedDraftKeys,
	writeStoredDraft,
} from "#session-drafts/storage.ts";

export type {
	SessionDraftRef,
	SessionDraftSlot,
} from "#session-drafts/storage.ts";

export interface SessionDraftSnapshot {
	readonly text: string;
	readonly version: number;
}

const cache = new Map<string, string>();
const versions = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

const current = (key: string): string => {
	const held = cache.get(key);
	if (held !== undefined) {
		return held;
	}
	const text = readStoredDraft(key);
	if (text !== "") {
		cache.set(key, text);
	}
	return text;
};

const publish = (key: string, text: string): void => {
	if (text === "") {
		cache.delete(key);
	} else {
		cache.set(key, text);
	}
	versions.set(key, (versions.get(key) ?? 0) + 1);
	writeStoredDraft(key, text);
	for (const listener of listeners.get(key) ?? []) {
		listener();
	}
};

export const readSessionDraft = (draft: SessionDraftRef): string =>
	current(draftStorageKey(draft));

export const writeSessionDraft = (draft: SessionDraftRef, text: string): void =>
	publish(draftStorageKey(draft), text);

export const watchSessionDraft = (
	draft: SessionDraftRef,
	listener: () => void,
): (() => void) => {
	const key = draftStorageKey(draft);
	const watching = listeners.get(key) ?? new Set<() => void>();
	watching.add(listener);
	listeners.set(key, watching);
	return () => {
		watching.delete(listener);
		if (watching.size === 0) {
			listeners.delete(key);
		}
	};
};

export const captureSessionDraft = (
	draft: SessionDraftRef,
): SessionDraftSnapshot => {
	const key = draftStorageKey(draft);
	return { text: current(key), version: versions.get(key) ?? 0 };
};

export const clearUnchangedSessionDraft = (
	draft: SessionDraftRef,
	snapshot: SessionDraftSnapshot,
): boolean => {
	const key = draftStorageKey(draft);
	if ((versions.get(key) ?? 0) !== snapshot.version) {
		return false;
	}
	publish(key, "");
	return true;
};

export const discardMissingSessionDrafts = (
	sessionIds: ReadonlySet<string>,
): void => {
	const keys = new Set([...cache.keys(), ...storedDraftKeys()]);
	for (const key of keys) {
		const sessionId = sessionIdFromDraftKey(key);
		if (sessionId !== undefined && !sessionIds.has(sessionId)) {
			publish(key, "");
		}
	}
};
