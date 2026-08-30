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

export const windowFixture = Layer.succeed(WindowSource, {
	open: (place) => (place.role === "console" ? new WindowRefused({ reason: "console_is_not_a_target" }) : Effect.void),
	place: Effect.succeed(consoleWindow),
	remember: () => Effect.void,
});
