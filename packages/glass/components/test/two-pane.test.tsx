import { labelled, settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { KEY } from "#adapters/pane-width.ts";
import { TwoPane } from "#compositions/two-pane.tsx";

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

const pane = (container: HTMLElement): HTMLElement =>
	container.querySelector("output")?.parentElement ?? Effect.runSync(Effect.die("the session pane is missing"));

const beside = <TwoPane list="the reading" pane={<output>a session</output>} />;

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
