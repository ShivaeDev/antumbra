import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type DraftRef, DraftSnapshot } from "@antumbra/platform-shell/bridge.ts";
import { Context, Effect, Layer, Schema } from "effect";

const DraftFile = Schema.fromJsonString(Schema.Record(Schema.String, DraftSnapshot));
export class ShellDrafts extends Context.Service<
	ShellDrafts,
	{
		readonly read: (ref: DraftRef) => Effect.Effect<DraftSnapshot>;
		readonly write: (ref: DraftRef, text: string) => Effect.Effect<DraftSnapshot>;
		readonly clear: (ref: DraftRef, revision: string) => Effect.Effect<void>;
		readonly onChanged: (listener: (ref: DraftRef, snapshot: DraftSnapshot) => void) => void;
	}
>()("@antumbra/desktop/ShellDrafts") {}

const key = (ref: DraftRef) => `${encodeURIComponent(ref.sessionId)}/${encodeURIComponent(ref.slot)}`;
export const ShellDraftsLayer = (directory: string) =>
	Layer.effect(ShellDrafts)(
		Effect.sync(() => {
			const path = join(directory, "drafts.json");
			const drafts = new Map(Object.entries(existsSync(path) ? Schema.decodeUnknownSync(DraftFile)(readFileSync(path, "utf8")) : {}));
			const listeners = new Set<(ref: DraftRef, snapshot: DraftSnapshot) => void>();
			const read = (ref: DraftRef): DraftSnapshot => drafts.get(key(ref)) ?? { text: "", revision: "" };
			const write = (ref: DraftRef, text: string): DraftSnapshot => {
				const snapshot = { text, revision: crypto.randomUUID() };
				writeFileSync(path, JSON.stringify(Object.fromEntries(new Map(drafts).set(key(ref), snapshot))));
				drafts.set(key(ref), snapshot);
				for (const listener of listeners) listener(ref, snapshot);
				return snapshot;
			};
			return {
				read: (ref: DraftRef) => Effect.sync(() => read(ref)),
				write: (ref: DraftRef, text: string) => Effect.sync(() => write(ref, text)),
				clear: (ref: DraftRef, revision: string) =>
					Effect.sync(() => {
						if (read(ref).revision === revision) write(ref, "");
					}),
				onChanged: (listener: (ref: DraftRef, snapshot: DraftSnapshot) => void) => {
					listeners.add(listener);
				},
			};
		}),
	);
