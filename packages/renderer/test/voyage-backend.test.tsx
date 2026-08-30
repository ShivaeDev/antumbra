// @vitest-environment happy-dom

import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { VoyageHeader } from "#views/voyage-header.tsx";

it.effect("shows the captain and crew backend choices independently", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<VoyageHeader onError={() => undefined} voyage={{ ...reefView, captainBackend: "claude", crewBackend: "codex" }} />);
				return Promise.resolve();
			}),
		);

		expect(
			[...container.querySelectorAll("fieldset")].map((fieldset) => ({
				backend: [...fieldset.querySelectorAll("button")].find((button) => button.getAttribute("aria-pressed") === "true")?.textContent,
				label: fieldset.querySelector("legend")?.textContent,
			})),
		).toEqual([
			{ backend: "claude", label: "Captain" },
			{ backend: "codex", label: "Crew" },
		]);
	}),
);
