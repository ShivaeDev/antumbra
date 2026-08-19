interface TranscriptMessage {
	readonly kind: "message";
	readonly role: "agent" | "user";
	readonly seq: number;
	readonly text: string;
}
interface TranscriptThinking {
	readonly kind: "thinking";
	readonly seq: number;
	readonly text: string;
}
interface TranscriptTool {
	readonly input: string;
	readonly kind: "tool";
	readonly name: string;
	readonly ok: boolean | undefined;
	readonly result: string | undefined;
	readonly seq: number;
}
interface TranscriptTelemetry {
	readonly kind: "telemetry";
	readonly label: string;
	readonly seq: number;
}
interface TranscriptRaw {
	readonly kind: "raw";
	readonly label: string;
	readonly payload: string;
	readonly seq: number;
}
export type TranscriptItem =
	| TranscriptMessage
	| TranscriptRaw
	| TranscriptTelemetry
	| TranscriptThinking
	| TranscriptTool;
