import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DraftRef } from "@antumbra/platform-shell/bridge.ts";
import { Context, Effect, Layer, Schema } from "effect";
import { LegacyDraft, upgradeDraft } from "#adapters/draft-upgrade.ts";

const DraftFile = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Union([Schema.String, LegacyDraft])));
export class ShellDrafts extends Context.Service<
	ShellDrafts,
	{
		readonly read: (ref: DraftRef) => Effect.Effect<string | null>;
		readonly write: (ref: DraftRef, value: string, expected?: string) => Effect.Effect<void>;
		readonly clear: (ref: DraftRef, expected: string) => Effect.Effect<void>;
		readonly onChanged: (listener: (ref: DraftRef, value: string | null) => void) => void;
	}
>()("@antumbra/desktop/ShellDrafts") {}

const key = (ref: DraftRef) => `${encodeURIComponent(ref.sessionId)}/${encodeURIComponent(ref.slot)}`;
export const ShellDraftsLayer = (directory: string) =>
	Layer.effect(ShellDrafts)(
		Effect.sync(() => {
			const path = join(directory, "drafts.json");
			const stored = existsSync(path) ? Schema.decodeUnknownSync(DraftFile)(readFileSync(path, "utf8")) : {};
			const drafts = new Map<string, string>();
			for (const [key, saved] of Object.entries(stored)) {
				const value = typeof saved === "string" ? saved : upgradeDraft(saved);
				if (value !== null) drafts.set(key, value);
			}
			const listeners = new Set<(ref: DraftRef, value: string | null) => void>();
			const read = (ref: DraftRef): string | null => drafts.get(key(ref)) ?? null;
			const write = (ref: DraftRef, value: string | null): void => {
				const next = new Map(drafts);
				if (value === null) next.delete(key(ref));
				else next.set(key(ref), value);
				writeFileSync(path, JSON.stringify(Object.fromEntries(next)));
				if (value === null) drafts.delete(key(ref));
				else drafts.set(key(ref), value);
				for (const listener of listeners) listener(ref, value);
			};
			return {
				read: (ref: DraftRef) => Effect.sync(() => read(ref)),
				write: (ref: DraftRef, value: string, expected?: string) =>
					Effect.sync(() => {
						if (expected === undefined || read(ref) === expected) write(ref, value);
					}),
				clear: (ref: DraftRef, expected: string) =>
					Effect.sync(() => {
						if (read(ref) === expected) write(ref, null);
					}),
				onChanged: (listener: (ref: DraftRef, value: string | null) => void) => {
					listeners.add(listener);
				},
			};
		}),
	);
