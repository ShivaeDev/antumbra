import { labelled, settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { SessionBeside } from "#navigation/session-beside.tsx";

const remembering = (): void => {
	const saved = new Map<string, string>();
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

const beside = <SessionBeside session={<output>a session</output>}>the reading</SessionBeside>;

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
