import { Effect, Layer } from "effect";
import { type WindowPlace, WindowRefused, WindowSource } from "#windows.ts";

export const consoleWindow: WindowPlace = {
	changeId: null,
	mode: "fleet",
	pieceId: null,
	role: "console",
	sessionId: null,
	voyageId: null,
};

// why: a fixture host has one window and it is the console — the same shape
// main serves, so a window standing on fixtures resolves its place rather
// than falling through to the refusal a placeless window shows.
export const windowFixture = Layer.succeed(WindowSource, {
	open: (place) =>
		place.role === "console"
			? new WindowRefused({ reason: "console_is_not_a_target" })
			: Effect.void,
	place: Effect.succeed(consoleWindow),
	remember: () => Effect.void,
});
