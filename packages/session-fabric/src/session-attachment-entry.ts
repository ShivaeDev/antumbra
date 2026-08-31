import type { LiveSessionAttachment } from "#session-attachment.ts";

export interface Entry {
	readonly acquisition: number;
	readonly agentId: string;
	readonly attachment: LiveSessionAttachment;
	readonly idleSince: number | undefined;
	readonly stirrings: number;
}

export const rested = (entry: Entry, since: number): Entry => ({
	...entry,
	idleSince: entry.idleSince ?? since,
});
