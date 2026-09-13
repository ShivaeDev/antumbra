import { click, labelled, settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { useState } from "react";
import { KEY } from "#adapters/pane-width.ts";
import { TwoPane } from "#compositions/two-pane.tsx";

const LIST = "the reading";

const remembering = (stored?: string): void => {
	const saved = new Map<string, string>(stored === undefined ? [] : [[KEY, stored]]);
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (key: string) => saved.get(key) ?? null,
			setItem: (key: string, value: string) => {
				saved.set(key, value);
			},
		},
	});
};

const sized = (target: Element, width: number): ResizeObserverEntry => ({
	borderBoxSize: [],
	contentBoxSize: [],
	contentRect: new DOMRectReadOnly(0, 0, width, 0),
	devicePixelContentBoxSize: [],
	target,
});

const observing = (): ((width: number) => void) => {
	let announce: ((width: number) => void) | undefined;
	class Watcher implements ResizeObserver {
		readonly told: ResizeObserverCallback;
		constructor(told: ResizeObserverCallback) {
			this.told = told;
		}
		observe(target: Element): void {
			announce = (width) => this.told([sized(target, width)], this);
		}
		unobserve(): void {
			announce = undefined;
		}
		disconnect(): void {
			announce = undefined;
		}
	}
	Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: Watcher });
	return (width) => {
		if (announce !== undefined) announce(width);
	};
};

const pane = (container: HTMLElement): HTMLElement =>
	container.querySelector("output")?.parentElement ?? Effect.runSync(Effect.die("the session pane is missing"));

const beside = <TwoPane list={LIST} pane={<output>a session</output>} />;

const Console = () => {
	const [open, setOpen] = useState(true);
	const session = (
		<output>
			a session
			<button aria-label="Close" onClick={() => setOpen(false)} type="button">
				Close
			</button>
		</output>
	);
	return <TwoPane list={LIST} pane={open ? session : null} />;
};

it.glass("drags the session pane wider and opens at that width again", function* ({ render }) {
	remembering();
	const container = yield* render(beside);
	expect(pane(container).style.width).toBe("608px");
	const handle = labelled<HTMLHRElement>(container, "Resize the session");
	yield* settle(() => handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 900, pointerId: 1 })));
	yield* settle(() => handle.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 800, pointerId: 1 })));
	yield* settle(() => handle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 800, pointerId: 1 })));
	expect(pane(container).style.width).toBe("708px");

	yield* render(<p>elsewhere</p>);
	const reopened = yield* render(beside);
	expect(pane(reopened).style.width).toBe("708px");
});

it.glass("nudges the session pane from the keyboard", function* ({ render }) {
	remembering();
	const container = yield* render(beside);
	const handle = labelled<HTMLHRElement>(container, "Resize the session");
	yield* settle(() => handle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" })));
	expect(pane(container).style.width).toBe("624px");
	yield* settle(() => handle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" })));
	expect(pane(container).style.width).toBe("608px");
});

it.glass("opens at a width it can show when the remembered one is out of range", function* ({ render }) {
	remembering("5000");
	const container = yield* render(beside);
	expect(pane(container).style.width).toBe("1120px");
});

it.glass("keeps the width it was dragged to when the drag is cancelled", function* ({ render }) {
	remembering();
	const container = yield* render(beside);
	const handle = labelled<HTMLHRElement>(container, "Resize the session");
	yield* settle(() => handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 900, pointerId: 1 })));
	yield* settle(() => handle.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 800, pointerId: 1 })));
	expect(handle.parentElement?.className).toContain("cursor-col-resize");
	yield* settle(() => handle.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, clientX: 0, pointerId: 1 })));
	expect(handle.parentElement?.className).not.toContain("cursor-col-resize");
	expect(pane(container).style.width).toBe("708px");

	yield* render(<p>elsewhere</p>);
	const reopened = yield* render(beside);
	expect(pane(reopened).style.width).toBe("708px");
});

it.glass("yields the session down to the list's floor and gives back the reader's width when the window widens", function* ({ render }) {
	remembering();
	const resize = observing();
	const container = yield* render(beside);
	expect(pane(container).style.width).toBe("608px");
	yield* settle(() => resize(900));
	expect(pane(container).style.width).toBe("515px");
	yield* settle(() => resize(1600));
	expect(pane(container).style.width).toBe("608px");
	expect(globalThis.localStorage.getItem(KEY)).toBeNull();
});

it.glass("holds both floors at the narrowest width that can show them", function* ({ render }) {
	remembering();
	const resize = observing();
	const container = yield* render(beside);
	yield* settle(() => resize(705));
	expect(container.textContent).toContain(LIST);
	expect(pane(container).style.width).toBe("320px");
});

it.glass("shows the session alone under the two floors and comes back to the list when it closes", function* ({ render }) {
	remembering();
	const resize = observing();
	const container = yield* render(<Console />);
	const reading = container.querySelector("output");
	yield* settle(() => resize(704));
	expect(container.textContent).not.toContain(LIST);
	expect(container.querySelector("output")).toBe(reading);
	expect(pane(container).style.width).toBe("");
	expect(container.querySelector('[aria-label="Resize the session"]')).toBeNull();

	yield* click(labelled(container, "Close"));
	expect(container.textContent).toContain(LIST);
	expect(container.querySelector("output")).toBeNull();
});
