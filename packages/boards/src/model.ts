import type { BoardOwnerKind, BoardRegister } from "@antumbra/board-vocabulary";
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

export type BoardEntryVariant =
	| {
			readonly kind: "mail";
			readonly precedence: MailPrecedence;
			readonly sourceRef: string;
	  }
	| {
			readonly kind: "note";
			readonly precedence: "routine";
			readonly sourceRef: string | null;
	  };

export type BoardEntryRow = BoardEntryFields & BoardEntryVariant;

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
