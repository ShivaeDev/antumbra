import type { BoardOwnerKind, BoardRegister, SummaryLevel } from "@antumbra/vocabulary/board";
import { Data, type Option } from "effect";

export type MailPrecedence = "flash" | "priority" | "routine";

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
	readonly sourceRef: string | null;
}

interface UnsummarizedFields {
	readonly coversFrom: null;
	readonly coversTo: null;
	readonly level: null;
}

export type BoardEntryVariant =
	| (UnsummarizedFields & {
			readonly kind: "mail";
			readonly precedence: MailPrecedence;
			readonly sourceRef: string;
	  })
	| (UnsummarizedFields & {
			readonly kind: "note";
			readonly precedence: "routine";
			readonly sourceRef: string | null;
	  })
	| (UnsummarizedFields & {
			readonly kind: "pieceSummary";
			readonly precedence: "routine";
			readonly sourceRef: string;
	  })
	| {
			readonly coversFrom: number;
			readonly coversTo: number;
			readonly kind: "summary";
			readonly level: SummaryLevel;
			readonly precedence: "routine";
			readonly sourceRef: null;
	  };

export type BoardEntryRow = BoardEntryFields & BoardEntryVariant;

export type SummaryRow = BoardEntryRow & { readonly kind: "summary" };

export type UnreadMailRow = BoardEntryRow & { readonly delivered: boolean };

interface EntryFields {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly register: BoardRegister;
}

export type EntryInput = Data.TaggedEnum<{
	Mail: EntryFields & {
		readonly precedence: MailPrecedence;
		readonly sourceRef: string;
	};
	Note: EntryFields & {
		readonly sourceRef?: string;
	};
	PieceSummary: {
		readonly authorAgentId: Option.Option<string>;
		readonly body: string;
		readonly pieceId: string;
	};
	Summary: {
		readonly authorAgentId: Option.Option<string>;
		readonly body: string;
		readonly coversFrom: number;
		readonly coversTo: number;
		readonly level: SummaryLevel;
	};
}>;

export const EntryInput = Data.taggedEnum<EntryInput>();

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
