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

export const until = (ready: () => boolean, description: string): Effect.Effect<void> =>
	Effect.gen(function* () {
		for (let attempt = 0; attempt < 200; attempt += 1) {
			yield* settle(() => undefined);
			if (ready()) {
				return;
			}
			yield* Effect.sleep("5 millis");
		}
		return yield* Effect.die(`Timed out waiting for ${description}`);
	});

type Writable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const prototypeOf = (control: Writable): object => {
	if (control instanceof HTMLSelectElement) {
		return HTMLSelectElement.prototype;
	}
	return control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
};

export const write = (control: Writable, value: string): Effect.Effect<void> =>
	settle(() => {
		Object.getOwnPropertyDescriptor(prototypeOf(control), "value")?.set?.call(control, value);
		control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
	});

function narrowed<Element extends HTMLElement>(found: HTMLElement | undefined): Element | undefined;
function narrowed(found: unknown): unknown {
	return found;
}

const labelling = (container: HTMLElement, label: string): HTMLElement | undefined => {
	for (const element of container.querySelectorAll("label")) {
		if (element.textContent?.trim() === label) return document.getElementById(element.htmlFor) ?? undefined;
	}
	return undefined;
};

const carrying = (container: HTMLElement, label: string): HTMLElement | undefined =>
	container.querySelector<HTMLElement>(`[aria-label="${label}"]`) ?? labelling(container, label);

export const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	narrowed<Element>(carrying(container, label)) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

export const renderedControl = (container: HTMLElement, label: string): Effect.Effect<void> =>
	until(() => carrying(container, label) !== undefined, `the control labelled "${label}" to render`);

const offers = (control: Writable, value: string): boolean =>
	!(control instanceof HTMLSelectElement) || [...control.options].some((option) => option.value === value);

export const fill = (container: HTMLElement, label: string, value: string): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* until(() => offers(labelled<Writable>(container, label), value), `"${label}" to offer "${value}"`);
		yield* write(labelled<Writable>(container, label), value);
	});

export const named = (form: HTMLFormElement): string | null | undefined =>
	document.getElementById(form.getAttribute("aria-labelledby") ?? "")?.textContent;

const findForm = (container: HTMLElement, name: string): HTMLFormElement | undefined =>
	[...container.querySelectorAll("form")].find((candidate) => named(candidate) === name);

export const form = (container: HTMLElement, name: string): HTMLFormElement =>
	findForm(container, name) ?? Effect.runSync(Effect.die(`no form named "${name}"`));

export const renderedForm = (container: HTMLElement, name: string): Effect.Effect<HTMLFormElement> =>
	until(() => findForm(container, name) !== undefined, `form "${name}" to render`).pipe(Effect.map(() => form(container, name)));

export const click = (control: HTMLElement): Effect.Effect<void> => settle(() => control.click());

export const press = (container: HTMLElement, text: string): Effect.Effect<void> =>
	Effect.gen(function* () {
		const button = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === text);
		if (button === undefined) {
			return yield* Effect.die(`no button named "${text}"`);
		}
		yield* click(button);
	});

export const submit = (container: HTMLElement, name: string): Effect.Effect<void> =>
	Effect.gen(function* () {
		const button = form(container, name).querySelector<HTMLButtonElement>('button[type="submit"]');
		if (button === null) {
			return yield* Effect.die(`no submit button in form "${name}"`);
		}
		yield* click(button);
	});

const pointing = (kind: string): PointerEvent => new PointerEvent(kind, { bubbles: true, button: 0, pointerId: 1, pointerType: "mouse" });

const offer = (label: string): HTMLElement | undefined =>
	[...document.body.querySelectorAll<HTMLElement>('[data-slot="select-item"]')].find((candidate) => candidate.textContent?.trim() === label);

export const pick = (container: HTMLElement, label: string, value: string): Effect.Effect<void> =>
	Effect.gen(function* () {
		const trigger = labelled(container, label);
		yield* settle(() => trigger.dispatchEvent(pointing("pointerdown")));
		yield* until(() => offer(value) !== undefined, `"${label}" to offer "${value}"`);
		const chosen = offer(value);
		if (chosen === undefined) return yield* Effect.die(`no option "${value}"`);
		yield* settle(() => {
			chosen.dispatchEvent(pointing("pointerup"));
			chosen.click();
		});
	});

export const choose = (control: HTMLSelectElement, values: readonly string[]): Effect.Effect<void> =>
	settle(() => {
		for (const option of control.options) {
			option.selected = values.includes(option.value);
		}
		control.dispatchEvent(new Event("change", { bubbles: true }));
	});
