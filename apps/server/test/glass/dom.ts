import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";

export const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

export const mount = () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			settle(() => {
				root.unmount();
				container.remove();
			}),
		);
		return { container, root };
	});

export const until = (ready: () => boolean): Effect.Effect<void> =>
	Effect.gen(function* () {
		for (let attempt = 0; attempt < 200; attempt += 1) {
			yield* settle(() => undefined);
			if (ready()) {
				return;
			}
			yield* Effect.sleep("5 millis");
		}
		return yield* Effect.die("the glass never settled");
	});

export const write = (control: HTMLInputElement | HTMLSelectElement, value: string): void => {
	const prototype = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(control, value);
	control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
};
