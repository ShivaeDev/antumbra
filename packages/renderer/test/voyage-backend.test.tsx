import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { VoyageHeader } from "#views/voyage-header.tsx";

const header = (backend: string) => <VoyageHeader onError={() => undefined} voyage={{ ...reefView, backend }} />;

const backendButtons = (container: HTMLElement) =>
	[...container.querySelectorAll("fieldset button")].map((button) => ({
		pressed: button.getAttribute("aria-pressed"),
		tag: button.textContent,
	}));

const rendered = (backend: string) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(header(backend));
				return Promise.resolve();
			}),
		);
		return backendButtons(container);
	});

it.effect("the voyage offers every backend and presses the one it sails on", () =>
	Effect.gen(function* () {
		expect(yield* rendered("claude")).toEqual([
			{ pressed: "true", tag: "claude" },
			{ pressed: "false", tag: "codex" },
			{ pressed: "false", tag: "opencode" },
		]);
		expect(yield* rendered("opencode")).toEqual([
			{ pressed: "false", tag: "claude" },
			{ pressed: "false", tag: "codex" },
			{ pressed: "true", tag: "opencode" },
		]);
	}),
);
