import { click, labelled, press, until } from "@antumbra/app-testing/glass/dom.ts";
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
		restartServer: Effect.void,
	};
	const container = yield* render(<RestartControl shell={shell} onError={() => undefined} />);
	yield* click(labelled(container, "Restart Antumbra"));
	expect(container.textContent).toContain("Keep running");
	for (const label of container.querySelectorAll("label")) {
		yield* click(label);
	}
	expect(requests).toBe(0);
	yield* press(container, "Restart now");
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
		restartServer: Effect.void,
	};
	const container = yield* render(<RestartControl shell={shell} onError={(message) => errors.push(message)} />);
	yield* click(labelled(container, "Restart Antumbra"));
	yield* press(container, "Restart now");
	yield* until(() => errors.length === 1, "the shell refusal");
	expect(errors[0]).toContain("the drain refused");
	expect(container.textContent).toContain("Keep running");
	yield* press(container, "Restart now");
	yield* until(() => requests === 2, "the next shell restart request");
});

it.glass("asks the shell to restart the server alone, without confirming", function* ({ render }) {
	let servers = 0;
	let restarts = 0;
	const shell = {
		restart: Effect.sync(() => {
			restarts += 1;
		}),
		restartServer: Effect.sync(() => {
			servers += 1;
		}),
	};
	const container = yield* render(<RestartControl shell={shell} onError={() => undefined} />);
	expect(container.textContent).toContain("Agents keep running; their tool calls wait until the server is back.");

	yield* click(labelled(container, "Restart the server"));

	yield* until(() => servers === 1, "the server restart request");
	expect(restarts).toBe(0);
	expect(container.textContent).not.toContain("Keep running");
});

it.glass("says so when the shell refuses to restart the server", function* ({ render }) {
	const errors: string[] = [];
	const shell = { restart: Effect.void, restartServer: Effect.fail(new Error("the server would not stop")) };
	const container = yield* render(<RestartControl shell={shell} onError={(message) => errors.push(message)} />);
	yield* click(labelled(container, "Restart the server"));
	yield* until(() => errors.length === 1, "the shell refusal");
	expect(errors[0]).toContain("the server would not stop");
});
