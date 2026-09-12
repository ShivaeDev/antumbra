import type { BoardEntryRow } from "@antumbra/boards";
import type { BoardRegister, SummaryLevel } from "@antumbra/platform-vocabulary/board.ts";

export interface StoredEntry {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly coversFrom: number | null;
	readonly coversTo: number | null;
	readonly createdAt: string;
	readonly id: string;
	readonly kind: "note" | "pieceSummary" | "summary";
	readonly level: SummaryLevel | null;
	readonly pieceId: string | null;
	readonly register: BoardRegister;
	readonly seq: number;
}

const NAMELESS = "";

export const entryOf = (stored: StoredEntry): BoardEntryRow => {
	const shared = {
		authorAgentId: stored.authorAgentId,
		body: stored.body,
		createdAt: new Date(stored.createdAt),
		id: stored.id,
		register: stored.register,
		seq: stored.seq,
	};
	if (stored.kind === "note") {
		return { ...shared, kind: "note" };
	}
	if (stored.kind === "pieceSummary") {
		return { ...shared, kind: "pieceSummary", pieceId: stored.pieceId ?? NAMELESS };
	}
	return { ...shared, coversFrom: stored.coversFrom ?? 0, coversTo: stored.coversTo ?? 0, kind: "summary", level: stored.level ?? "day" };
};
