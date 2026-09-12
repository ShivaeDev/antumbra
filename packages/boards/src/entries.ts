import type { BoardEntryRow } from "#model.ts";

export const entryBodies = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<string> => entries.map((entry) => entry.body);
