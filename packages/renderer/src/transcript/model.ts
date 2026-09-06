import type { SessionInputId, SessionMessagePart } from "@antumbra/contract";
import type { SubsessionEnded } from "@antumbra/vocabulary/session-events.ts";

export interface TranscriptMessage {
	readonly inputId: SessionInputId | undefined;
	readonly kind: "message";
	readonly parts: ReadonlyArray<SessionMessagePart>;
	readonly role: "agent" | "user";
	readonly seq: number;
	readonly text: string;
}
export interface TranscriptThinking {
	readonly kind: "thinking";
	readonly seq: number;
	readonly text: string;
}
export interface TranscriptTool {
	readonly input: string;
	readonly kind: "tool";
	readonly name: string;
	readonly ok: boolean | undefined;
	readonly providerName?: string;
	readonly result: string | undefined;
	readonly seq: number;
	readonly servedBy?: "antumbra";
}
interface TranscriptTelemetry {
	readonly kind: "telemetry";
	readonly label: string;
	readonly seq: number;
}
export interface TranscriptRaw {
	readonly kind: "raw";
	readonly label: string;
	readonly payload: string;
	readonly seq: number;
}
export interface TranscriptDelegation {
	readonly displayName: string;
	readonly kind: "delegation";
	readonly nodeId: string | undefined;
	readonly outcome: (typeof SubsessionEnded.Type)["outcome"] | undefined;
	readonly seq: number;
	readonly state: "ended" | "opened";
}
export interface TranscriptNotice {
	readonly detail: string | undefined;
	readonly kind: "notice";
	readonly seq: number;
	readonly title: string;
}
export type TranscriptItem =
	| TranscriptDelegation
	| TranscriptMessage
	| TranscriptNotice
	| TranscriptRaw
	| TranscriptTelemetry
	| TranscriptThinking
	| TranscriptTool;
