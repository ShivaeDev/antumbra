import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { VoyageHeader } from "#views/voyage-header.tsx";

vi.mock("#adapters/trpc-costs.ts", () => ({ watchCosts: vi.fn(() => vi.fn()) }));

it.effect("shows the captain and crew backend choices independently", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			Effect.promise(() =>
				act(() => {
					root.unmount();
					container.remove();
					return Promise.resolve();
				}),
			),
		);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<VoyageHeader onError={() => undefined} voyage={{ ...reefView, captainBackend: "claude", crewBackend: "opencode" }} />);
				return Promise.resolve();
			}),
		);

		expect(
			[...container.querySelectorAll("fieldset:has(legend)")].map((fieldset) => ({
				backend: [...fieldset.querySelectorAll("button")].find((button) => button.getAttribute("aria-pressed") === "true")?.textContent,
				label: fieldset.querySelector("legend")?.textContent,
			})),
		).toEqual([
			{ backend: "claude", label: "Captain" },
			{ backend: "opencode", label: "Crew" },
		]);
	}),
);
