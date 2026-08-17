import type { Option } from "effect";

export type BoardRegister = "rough" | "smooth";

export type MailPrecedence = "flash" | "priority" | "routine";

// why: entity ids may overlap across kinds; this discriminated pair is the
// durable address while each linked board id stays globally exclusive.
export type BoardScope =
	| { readonly agentId: string; readonly kind: "agent" }
	| { readonly kind: "piece"; readonly pieceId: string }
	| { readonly kind: "voyage"; readonly voyageId: string };

export interface BoardOwner {
	readonly ownerId: string;
	readonly ownerKind: BoardScope["kind"];
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

export type BoardEntryRow = BoardEntryFields &
	(
		| {
				readonly kind: "mail";
				readonly precedence: MailPrecedence;
				readonly sourceRef: string;
		  }
		| {
				readonly kind: "note";
				readonly precedence: "routine";
		  }
	);

interface EntryFields {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly register: BoardRegister;
}

export type EntryInput = EntryFields &
	(
		| {
				readonly kind: "mail";
				readonly precedence: MailPrecedence;
				readonly sourceRef: string;
		  }
		| {
				readonly kind?: "note";
				readonly precedence?: "routine";
				readonly sourceRef?: string;
		  }
	);

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
