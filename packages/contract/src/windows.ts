import { Context, Data, type Effect, Schema } from "effect";
import type { RequestOrigin } from "#router-procedure.ts";

// why: the console shows one of three things at a time — the fleet at work,
// the voyages the work is for, and the quay where finished work waits on a
// host. Which one is on show belongs to the window, not to the page, so a
// reloaded console comes back to what it was pointed at.
export const ConsoleMode = Schema.Literals(["fleet", "voyages", "quay"]);
export type ConsoleMode = typeof ConsoleMode.Type;

// why: a window's role is minted by the shell and never travels in its URL.
// The URL is what proves a window's authority, so a page able to name its own
// role would be a page able to name its own powers.
export const ConsolePlace = Schema.Struct({
	mode: ConsoleMode,
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

export const WindowPlace = Schema.Union([ConsolePlace, TranscriptPlace]);
export type WindowPlace = typeof WindowPlace.Type;

export class WindowRefused extends Data.TaggedError("WindowRefused")<{
	readonly reason:
		| "console_is_not_a_target"
		| "not_the_console"
		| "role_is_immutable"
		| "unknown_window";
}> {}

export class WindowSource extends Context.Service<
	WindowSource,
	{
		readonly open: (
			place: WindowPlace,
		) => Effect.Effect<void, WindowRefused, RequestOrigin>;
		readonly place: Effect.Effect<WindowPlace, WindowRefused, RequestOrigin>;
		readonly remember: (
			place: WindowPlace,
		) => Effect.Effect<void, WindowRefused, RequestOrigin>;
	}
>()("@antumbra/contract/WindowSource") {}
