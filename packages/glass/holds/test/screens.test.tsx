import { eventually } from "@antumbra/app-testing/answers.ts";
import { until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { HoldsPanel } from "#holds.tsx";

it.glass("shows both queues and persists the global hold through the switch", function* ({ api, render }) {
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => container.querySelector('input[aria-label="All queues"]') !== null, "the hold switches");
	expect(container.textContent).toContain("Piece dispatch");
	expect(container.textContent).toContain("Wakes");
	expect(container.textContent).toContain("No launched piece is waiting for an agent.");
	expect(container.textContent).toContain("No resting agent has mail due.");
	const global = container.querySelector<HTMLInputElement>('input[aria-label="All queues"]');
	if (global === null) return yield* Effect.die("Missing global hold");
	global.click();
	const held = yield* eventually(api.holds.queues({}), (view) => view.everything);
	expect(held.queues.map((queue) => queue.held)).toEqual([true, true]);
	yield* until(() => !global.disabled, "the hold save");
	global.click();
	const released = yield* eventually(api.holds.queues({}), (view) => !view.everything);
	expect(released.queues.map((queue) => queue.held)).toEqual([false, false]);
});
