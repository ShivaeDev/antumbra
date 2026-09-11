import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { OpenVoyage } from "#open-voyage.tsx";
import { type Desk, desk } from "#test/desk.ts";
import { mount, settle, until, write } from "#test/dom.ts";

const shown = (board: Desk, onOpened: () => void) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() =>
			root.render(
				<board.glass.Provider>
					<OpenVoyage api={board.glass.api} onOpened={onOpened} />
				</board.glass.Provider>,
			),
		);
		yield* until(() => container.querySelectorAll("form").length > 0);
		return container;
	});

const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	container.querySelector<Element>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

const opening = (container: HTMLElement) => settle(() => container.querySelector("button")?.click());

it.live("draws every field a voyage is opened with and none of the kind it is fixed to", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, () => undefined);

		expect([...container.querySelectorAll("div > span[aria-hidden]")].map((title) => title.textContent)).toEqual([
			"Name",
			"North star",
			"Context",
			"Captain backend",
			"Captain model",
			"Captain effort",
			"Crew backend",
			"Crew model",
			"Crew effort",
		]);
		expect(labelled(container, "Open voyage Context").tagName).toBe("TEXTAREA");
		expect(container.querySelector('[aria-label="Open voyage Kind"]')).toBeNull();
	}),
);

it.live("puts a name the server refuses on the field that carries it", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, () => undefined);
		const name = labelled<HTMLInputElement>(container, "Open voyage Name");

		yield* settle(() => write(name, "   "));
		yield* opening(container);

		yield* until(() => name.getAttribute("aria-invalid") === "true");
		expect(container.textContent).toContain("A voyage needs a name");
		expect(board.sent).toHaveLength(0);
	}),
);

it.live("opens the voyage once, under the kind the screen fixes, and empties the form", () =>
	Effect.gen(function* () {
		const board = desk();
		let opened = 0;
		const container = yield* shown(board, () => {
			opened += 1;
		});

		yield* settle(() => write(labelled<HTMLInputElement>(container, "Open voyage Name"), "Chart the reef"));
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Open voyage North star"), "every shoal is known"));
		yield* settle(() => write(labelled<HTMLTextAreaElement>(container, "Open voyage Context"), "the reef is uncharted"));
		yield* opening(container);

		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({
			context: "the reef is uncharted",
			kind: "voyage",
			name: "Chart the reef",
			northStar: "every shoal is known",
		});
		yield* until(() => labelled<HTMLInputElement>(container, "Open voyage Name").value === "");
		expect(opened).toBe(1);
	}),
);
