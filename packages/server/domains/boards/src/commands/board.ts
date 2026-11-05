import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const BODY = "body";

export const SPAN = "coversTo";

export const NEEDS_BODY = "An entry needs a body";

export const SUMMARY_NEEDS_BODY = "A summary needs a body";

export const SUMMARY_NEEDS_SPAN = "A summary needs a span";

export const owned = [boardEntry, piece, voyage] as const;
