import { Context, Data, type Effect, Schema } from "effect";
import type { RequestOrigin } from "#router-procedure.ts";

// why: the console shows one section at a time — flagship, fleet, voyages,
// quay, rulings or settings. Which one is on show belongs to the window, not
// to the page, so a reloaded console comes back to what it was pointed at.
export const ConsoleMode = Schema.Literals(["flagship", "fleet", "voyages", "quay", "rulings", "settings"]);
export type ConsoleMode = typeof ConsoleMode.Type;

// why: a window's role is minted by the shell and never travels in its URL.
// The URL is what proves a window's authority, so a page able to name its own
// role would be a page able to name its own powers.
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

// why: an artifact is immutable once landed, so a window onto one is a window
// onto a fact that cannot change under it — which is what makes it worth
// keeping open beside the work rather than inside it.
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
