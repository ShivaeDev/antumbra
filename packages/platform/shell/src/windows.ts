import { Data, Schema } from "effect";

export const ConsoleMode = Schema.Literals(["flagship", "fleet", "voyages", "quay", "rulings", "costs", "holds", "settings"]);
export type ConsoleMode = typeof ConsoleMode.Type;

export const ConsolePlace = Schema.Struct({
	changeId: Schema.NullOr(Schema.String),
	mode: ConsoleMode,
	pieceId: Schema.optional(Schema.NullOr(Schema.String)),
	role: Schema.Literal("console"),
	sessionId: Schema.NullOr(Schema.String),
	voyageId: Schema.NullOr(Schema.String),
});
export type ConsolePlace = typeof ConsolePlace.Type;

export const defaultConsole = {
	changeId: null,
	mode: "flagship",
	pieceId: null,
	role: "console",
	sessionId: null,
	voyageId: null,
} as const satisfies ConsolePlace;

const TranscriptPlace = Schema.Struct({
	role: Schema.Literal("transcript"),
	sessionId: Schema.String,
});

const ArtifactPlace = Schema.Struct({
	artifactId: Schema.String,
	role: Schema.Literal("artifact"),
});

export const WindowPlace = Schema.Union([ConsolePlace, TranscriptPlace, ArtifactPlace]);
export type WindowPlace = typeof WindowPlace.Type;

export class WindowRefused extends Data.TaggedError("WindowRefused")<{
	readonly reason: "console_is_not_a_target" | "not_the_console" | "role_is_immutable" | "unknown_window";
}> {}
