import type { WindowPlace } from "@antumbra/contract";
import { Data, Effect } from "effect";
import { client, toError } from "#adapters/bridge.ts";

class WindowPlaceLoadError extends Data.TaggedError("WindowPlaceLoadError")<{
	readonly message: string;
}> {}

type OnError = (message: string) => void;

// why: the window asks main where it belongs. Nothing in the page says it —
// the address every window loads is the same one, and it is what proves the
// window's authority rather than what describes it.
export const loadWindowPlace: Effect.Effect<WindowPlace, WindowPlaceLoadError> = Effect.tryPromise({
	catch: (cause) => new WindowPlaceLoadError({ message: String(cause) }),
	try: () => client.windowPlace.query(),
});

export const openWindow = (place: WindowPlace, onError: OnError): void => {
	client.openWindow
		.mutate(place)
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const rememberPlace = (place: WindowPlace, onError: OnError): void => {
	client.rememberPlace
		.mutate(place)
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};
