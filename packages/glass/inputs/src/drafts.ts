import type { Effect, Stream } from "effect";
export interface DraftRef {
	readonly sessionId: string;
	readonly slot: string;
}
export interface DraftSnapshot {
	readonly text: string;
	readonly revision: string;
}
export interface Drafts {
	readonly watch: (ref: DraftRef) => Stream.Stream<DraftSnapshot>;
	readonly write: (ref: DraftRef, text: string) => Effect.Effect<DraftSnapshot>;
	readonly clear: (ref: DraftRef, revision: string) => Effect.Effect<void>;
}
