import { Context, Data, type Effect, Schema } from "effect";
import type { RequestOrigin } from "#router-procedure.ts";

export const ConsoleMode = Schema.Literals(["flagship", "fleet", "voyages", "quay", "rulings", "settings"]);
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

export const TranscriptPlace = Schema.Struct({
	role: Schema.Literal("transcript"),
	sessionId: Schema.String,
});
export type TranscriptPlace = typeof TranscriptPlace.Type;

export const ArtifactPlace = Schema.Struct({
	artifactId: Schema.String,
	role: Schema.Literal("artifact"),
});
export type ArtifactPlace = typeof ArtifactPlace.Type;

export const WindowPlace = Schema.Union([ConsolePlace, TranscriptPlace, ArtifactPlace]);
export type WindowPlace = typeof WindowPlace.Type;

export class WindowRefused extends Data.TaggedError("WindowRefused")<{
	readonly reason: "console_is_not_a_target" | "not_the_console" | "role_is_immutable" | "unknown_window";
}> {}

export class WindowSource extends Context.Service<
	WindowSource,
	{
		readonly open: (place: WindowPlace) => Effect.Effect<void, WindowRefused, RequestOrigin>;
		readonly place: Effect.Effect<WindowPlace, WindowRefused, RequestOrigin>;
		readonly remember: (place: WindowPlace) => Effect.Effect<void, WindowRefused, RequestOrigin>;
	}
>()("@antumbra/contract/WindowSource") {}
