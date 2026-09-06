import type { SessionInput } from "@antumbra/plugin-api";
import type { SessionImageMediaType, SessionInputId } from "@antumbra/vocabulary/session-input.ts";

export type SessionInputDeliveryStatus = "accepted" | "ambiguous" | "pending" | "queued_for_wake" | "refused";

export type SessionInputDraftPart =
	| { readonly text: string; readonly type: "text" }
	| {
			readonly bytes: Uint8Array;
			readonly declaredMediaType?: string | undefined;
			readonly name: string;
			readonly type: "image";
	  };

export interface SessionInputDraft {
	readonly id: SessionInputId;
	readonly parts: readonly [SessionInputDraftPart, ...SessionInputDraftPart[]];
	readonly sessionId: string;
}

export interface SessionInputReading {
	readonly id: SessionInputId;
	readonly status: SessionInputDeliveryStatus;
}

export interface SessionInputImage {
	readonly bytes: Uint8Array;
	readonly mediaType: SessionImageMediaType;
	readonly name: string;
}

export interface StoredSessionInput {
	readonly input: SessionInput;
	readonly sessionId: string;
	readonly status: SessionInputDeliveryStatus;
}

export type PreparedSessionInputPart =
	| { readonly text: string; readonly type: "text" }
	| {
			readonly image: {
				readonly bytes: Uint8Array;
				readonly digest: string;
				readonly height: number;
				readonly mediaType: SessionImageMediaType;
				readonly width: number;
			};
			readonly name: string;
			readonly type: "image";
	  };

export interface PreparedSessionInput {
	readonly id: SessionInputId;
	readonly parts: ReadonlyArray<PreparedSessionInputPart>;
	readonly requestDigest: string;
	readonly sessionId: string;
}
