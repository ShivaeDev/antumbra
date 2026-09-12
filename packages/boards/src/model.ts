import type { BoardRegister, SummaryLevel } from "@antumbra/platform-vocabulary/board.ts";
import { Data, type Option } from "effect";

export type MailPrecedence = "flash" | "priority" | "routine";

export type BoardScope = Data.TaggedEnum<{
	Agent: { readonly agentId: string };
	Piece: { readonly pieceId: string };
	Voyage: { readonly voyageId: string };
}>;

export const BoardScope = Data.taggedEnum<BoardScope>();

interface EntryRowFields {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly createdAt: Date;
	readonly id: string;
	readonly register: BoardRegister;
	readonly seq: number;
}

export interface MailRow extends EntryRowFields {
	readonly kind: "mail";
	readonly precedence: MailPrecedence;
	readonly sourceRef: string;
}

export interface NoteRow extends EntryRowFields {
	readonly kind: "note";
}

export interface PieceSummaryRow extends EntryRowFields {
	readonly kind: "pieceSummary";
	readonly pieceId: string;
}

export interface SummaryRow extends EntryRowFields {
	readonly coversFrom: number;
	readonly coversTo: number;
	readonly kind: "summary";
	readonly level: SummaryLevel;
}

export type BoardEntryRow = NoteRow | PieceSummaryRow | SummaryRow;

export type UnreadMailRow = MailRow & { readonly delivered: boolean };

interface EntryFields {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly id?: string;
}

export type EntryInput = Data.TaggedEnum<{
	Mail: Omit<EntryFields, "id"> & {
		readonly precedence: MailPrecedence;
		readonly register: BoardRegister;
		readonly sourceRef: string;
	};
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

export type MailEntry = Extract<EntryInput, { readonly _tag: "Mail" }>;

export type BoardEntryInput = Exclude<EntryInput, { readonly _tag: "Mail" }>;

export interface MailInput {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly precedence: MailPrecedence;
	readonly sourceRef: string;
	readonly toAgentId: string;
}

export interface AppendFields {
	readonly nowMillis: number;
	readonly seq: number;
}
