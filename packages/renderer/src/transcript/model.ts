export interface TranscriptMessage {
	readonly kind: "message";
	readonly role: string;
	readonly seq: number;
	readonly text: string;
}
export interface TranscriptTool {
	readonly input: string;
	readonly kind: "tool";
	readonly name: string;
	readonly result: string | undefined;
	readonly seq: number;
}
export interface TranscriptTelemetry {
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
export type TranscriptItem =
	| TranscriptMessage
	| TranscriptRaw
	| TranscriptTelemetry
	| TranscriptTool;
