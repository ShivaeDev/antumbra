import type { DraftStorage } from "@shivaedev/form/persistence.ts";

export interface DraftRef {
	readonly sessionId: string;
	readonly slot: string;
}

export type Drafts = (ref: DraftRef) => DraftStorage;
