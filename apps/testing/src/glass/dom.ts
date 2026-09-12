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

type Writable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const prototypeOf = (control: Writable): object => {
	if (control instanceof HTMLSelectElement) {
		return HTMLSelectElement.prototype;
	}
	return control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
};

export const write = (control: Writable, value: string): void => {
	Object.getOwnPropertyDescriptor(prototypeOf(control), "value")?.set?.call(control, value);
	control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
};

export const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	container.querySelector<Element>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

export const named = (form: HTMLFormElement): string | null | undefined =>
	document.getElementById(form.getAttribute("aria-labelledby") ?? "")?.textContent;

export const submit = (container: HTMLElement, place: number) =>
	settle(() => [...container.querySelectorAll("form")][place]?.querySelector("button")?.click());

export const press = (container: HTMLElement, words: string): Effect.Effect<void> =>
	settle(() => {
		for (const button of container.querySelectorAll("button")) {
			if (button.textContent === words) {
				button.click();
			}
		}
	});
export const choose = (control: HTMLSelectElement, values: readonly string[]): void => {
	for (const option of control.options) {
		option.selected = values.includes(option.value);
	}
	control.dispatchEvent(new Event("change", { bubbles: true }));
};
