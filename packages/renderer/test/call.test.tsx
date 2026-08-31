// @vitest-environment happy-dom

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach } from "vitest";
import { type Call, type CallState, useCall } from "#hooks/call.ts";

interface Waiting {
	readonly onDone: (value: string) => void;
	readonly onError: (message: string) => void;
}

const waiting: Array<Waiting> = [];

const defer: Call<string> = (onDone, onError) => {
	waiting.push({ onDone, onError });
};

const shown = (state: CallState<string>): string => {
	if (state._tag === "done") return `done:${state.value}`;
	if (state._tag === "failed") return `failed:${state.message}`;
	return state._tag;
};

const Probe = () => {
	const call = useCall<string>();
	return (
		<div>
			<span id="state">{shown(call.state)}</span>
			<button onClick={() => call.run(defer)} type="button">
				run
			</button>
			<button onClick={call.reset} type="button">
				reset
			</button>
		</div>
	);
};

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const step = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const render = (root: Root): Effect.Effect<void> => step(() => root.render(<Probe />));

const press = (container: HTMLElement, label: string): Effect.Effect<void> =>
	step(() => [...container.querySelectorAll("button")].find((button) => button.textContent === label)?.click());

const state = (container: HTMLElement): string => container.querySelector("#state")?.textContent ?? "";

beforeEach(() => {
	waiting.length = 0;
});

it.effect("is idle until it is run, and pending until it is answered", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root);
		expect(state(container)).toBe("idle");

		yield* press(container, "run");
		expect(state(container)).toBe("pending");

		yield* step(() => waiting[0]?.onDone("the chart"));
		expect(state(container)).toBe("done:the chart");

		yield* press(container, "reset");
		expect(state(container)).toBe("idle");
		yield* step(() => root.unmount());
	}),
);

it.effect("carries a refusal as the answer", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root);
		yield* press(container, "run");

		yield* step(() => waiting[0]?.onError("stored Artifact is missing"));

		expect(state(container)).toBe("failed:stored Artifact is missing");
		yield* step(() => root.unmount());
	}),
);
