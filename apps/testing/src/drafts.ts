import type { DraftRef, Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { Effect } from "effect";

export const memoryDrafts = (): Drafts => {
	const saved = new Map<string, string>();
	const listeners = new Map<string, Set<(raw: string | null) => void>>();
	const changed = (key: string, raw: string | null) => {
		for (const listener of listeners.get(key) ?? []) listener(raw);
	};
	return (ref: DraftRef) => {
		const key = JSON.stringify(ref);
		return {
			getItem: () => Effect.succeed(saved.get(key) ?? null),
			setItem: (_key, raw, expected) =>
				Effect.sync(() => {
					if (expected === undefined || saved.get(key) === expected) {
						saved.set(key, raw);
						changed(key, raw);
					}
				}),
			removeItem: (_key, expected) =>
				Effect.sync(() => {
					if (saved.get(key) === expected) {
						saved.delete(key);
						changed(key, null);
					}
				}),
			subscribe: (_key, listener) => {
				const observers = listeners.get(key) ?? new Set();
				listeners.set(key, observers);
				observers.add(listener);
				return () => {
					observers.delete(listener);
				};
			},
		};
	};
};
