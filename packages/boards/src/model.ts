import type { BoardOwnerKind, BoardRegister, SummaryLevel } from "@antumbra/platform-vocabulary/board.ts";
import { Data, type Option } from "effect";

export type BoardScope = Data.TaggedEnum<{
	Agent: { readonly agentId: string };
	Piece: { readonly pieceId: string };
	Voyage: { readonly voyageId: string };
}>;

export const BoardScope = Data.taggedEnum<BoardScope>();

export interface BoardOwner {
	readonly ownerId: string;
	readonly ownerKind: BoardOwnerKind;
}

interface BoardEntryFields {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly createdAt: Date;
	readonly id: string;
	readonly register: BoardRegister;
	readonly seq: number;
}

export interface NoteRow extends BoardEntryFields {
	readonly kind: "note";
}

export interface PieceSummaryRow extends BoardEntryFields {
	readonly kind: "pieceSummary";
	readonly pieceId: string;
}

export interface SummaryRow extends BoardEntryFields {
	readonly coversFrom: number;
	readonly coversTo: number;
	readonly kind: "summary";
	readonly level: SummaryLevel;
}

export type BoardEntryRow = NoteRow | PieceSummaryRow | SummaryRow;

interface EntryFields {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly id?: string;
}

export type EntryInput = Data.TaggedEnum<{
	Note: EntryFields & {
		readonly register: BoardRegister;
	};
	PieceSummary: EntryFields & {
		readonly pieceId: string;
	};
	Summary: EntryFields & {
		readonly coversFrom: number;
		readonly coversTo: number;
		readonly level: SummaryLevel;
	};
}>;

export const EntryInput = Data.taggedEnum<EntryInput>();

export interface AppendFields {
	readonly nowMillis: number;
	readonly seq: number;
}
