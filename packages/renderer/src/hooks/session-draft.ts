import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
	captureSessionDraft,
	clearUnchangedSessionDraft,
	readSessionDraft,
	type SessionDraftRef,
	type SessionDraftSlot,
	type SessionDraftSnapshot,
	watchSessionDraft,
	writeSessionDraft,
} from "#session-drafts/store.ts";

export const useSessionDraft = (sessionId: string, slot: SessionDraftSlot) => {
	const draft = useMemo<SessionDraftRef>(() => ({ sessionId, slot }), [sessionId, slot]);
	const subscribe = useCallback((listener: () => void) => watchSessionDraft(draft, listener), [draft]);
	const snapshot = useCallback(() => readSessionDraft(draft), [draft]);
	const text = useSyncExternalStore(subscribe, snapshot, () => "");
	const capture = useCallback(() => captureSessionDraft(draft), [draft]);
	const clear = useCallback((sent: SessionDraftSnapshot) => clearUnchangedSessionDraft(draft, sent), [draft]);
	const setText = useCallback((next: string) => writeSessionDraft(draft, next), [draft]);

	return { capture, clear, setText, text };
};
