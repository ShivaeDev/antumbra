import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { RestartControl } from "#settings/restart-control.tsx";

it.glass("confirms before asking the shell to restart once", function* ({ render }) {
	let requests = 0;
	const shell = {
		restart: Effect.sync(() => {
			requests += 1;
		}),
	};
	const container = yield* render(<RestartControl shell={shell} onError={() => undefined} />);
	yield* press(container, "Restart Antumbra");
	expect(container.textContent).toContain("Stop running agents, restart, and wake them again");
	expect(requests).toBe(0);
	yield* press(container, "Restart");
	yield* until(() => requests === 1, "the shell restart request");
	const restarting = [...container.querySelectorAll("button")].find((button) => button.textContent === "Restarting…");
	expect(restarting?.disabled).toBe(true);
	expect(container.textContent).not.toContain("Keep running");
});

it.glass("offers restart again when the shell refuses", function* ({ render }) {
	let requests = 0;
	const errors: string[] = [];
	const shell = {
		restart: Effect.sync(() => {
			requests += 1;
		}).pipe(Effect.andThen(Effect.fail(new Error("the drain refused")))),
	};
	const container = yield* render(<RestartControl shell={shell} onError={(message) => errors.push(message)} />);
	yield* press(container, "Restart Antumbra");
	yield* press(container, "Restart");
	yield* until(() => errors.length === 1, "the shell refusal");
	expect(errors[0]).toContain("the drain refused");
	expect(container.textContent).toContain("Keep running");
	yield* press(container, "Restart");
	yield* until(() => requests === 2, "the next shell restart request");
});
