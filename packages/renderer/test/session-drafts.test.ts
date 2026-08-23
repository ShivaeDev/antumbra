// why: @vitest-environment happy-dom supplies the same local storage boundary
// the desktop renderer uses.

import { expect, it } from "@effect/vitest";
import { beforeEach } from "vitest";
import { draftStorageKey } from "#session-drafts/storage.ts";
import {
	discardMissingSessionDrafts,
	readSessionDraft,
	type SessionDraftRef,
	writeSessionDraft,
} from "#session-drafts/store.ts";

const message = (sessionId: string): SessionDraftRef => ({
	sessionId,
	slot: "message",
});
const situation = (sessionId: string): SessionDraftRef => ({
	sessionId,
	slot: "situation:change-1:merge_conflicts",
});

const localStorage = (): Storage => {
	const values = new Map<string, string>();
	return {
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		get length() {
			return values.size;
		},
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, value),
	};
};

beforeEach(() => {
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		value: localStorage(),
	});
	discardMissingSessionDrafts(new Set());
});

it("persists non-empty drafts locally and removes empty ones", () => {
	const draft = message("session-reload");
	writeSessionDraft(draft, "survives a renderer reload");
	expect(window.localStorage.getItem(draftStorageKey(draft))).toBe(
		"survives a renderer reload",
	);
	expect(readSessionDraft(draft)).toBe("survives a renderer reload");

	writeSessionDraft(draft, "");
	expect(window.localStorage.getItem(draftStorageKey(draft))).toBeNull();
	expect(readSessionDraft(draft)).toBe("");
});

it("keeps sessions and composer variants independent", () => {
	writeSessionDraft(message("session-one"), "ordinary one");
	writeSessionDraft(situation("session-one"), "situation one");
	writeSessionDraft(message("session-two"), "ordinary two");

	expect(readSessionDraft(message("session-one"))).toBe("ordinary one");
	expect(readSessionDraft(situation("session-one"))).toBe("situation one");
	expect(readSessionDraft(message("session-two"))).toBe("ordinary two");
});

it("discards every variant only when its session disappears", () => {
	writeSessionDraft(message("session-held"), "keep me");
	writeSessionDraft(situation("session-held"), "keep this too");
	writeSessionDraft(message("session-deleted"), "forget me");
	window.localStorage.setItem("another-app", "untouched");

	discardMissingSessionDrafts(new Set(["session-held"]));

	expect(readSessionDraft(message("session-held"))).toBe("keep me");
	expect(readSessionDraft(situation("session-held"))).toBe("keep this too");
	expect(readSessionDraft(message("session-deleted"))).toBe("");
	expect(window.localStorage.getItem("another-app")).toBe("untouched");
});
