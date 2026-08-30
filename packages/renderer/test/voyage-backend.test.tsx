// why: @vitest-environment happy-dom reads the two seats off the buttons an
// admiral would press, not out of a string.

import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { VoyageHeader } from "#views/voyage-header.tsx";

const { setCaptainBackend, setCrewBackend } = vi.hoisted(() => ({
	setCaptainBackend: vi.fn(),
	setCrewBackend: vi.fn(),
}));

vi.mock("#adapters/trpc-voyages.ts", () => ({
	focusVoyage: vi.fn(),
	hailCaptain: vi.fn(),
	setCaptainBackend,
	setCrewBackend,
}));

const seats = (container: HTMLElement) =>
	[...container.querySelectorAll("fieldset")].map((fieldset) => ({
		offers: [...fieldset.querySelectorAll("button")].map((button) => ({
			pressed: button.getAttribute("aria-pressed"),
			tag: button.textContent,
		})),
		seat: fieldset.querySelector("legend")?.textContent,
	}));

const rendered = (captainBackend: string, crewBackend: string) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(
					<VoyageHeader
						onError={() => undefined}
						voyage={{ ...reefView, captainBackend, crewBackend }}
					/>,
				);
				return Promise.resolve();
			}),
		);
		return container;
	});

it.effect(
	"each seat offers every backend and presses the one it sails on",
	() =>
		Effect.gen(function* () {
			expect(seats(yield* rendered("claude", "codex"))).toEqual([
				{
					offers: [
						{ pressed: "true", tag: "claude" },
						{ pressed: "false", tag: "codex" },
					],
					seat: "Captain",
				},
				{
					offers: [
						{ pressed: "false", tag: "claude" },
						{ pressed: "true", tag: "codex" },
					],
					seat: "Crew",
				},
			]);
		}),
);

it.effect("a seat switches its own backend and never the other's", () =>
	Effect.gen(function* () {
		const container = yield* rendered("claude", "claude");
		const crew = [...container.querySelectorAll("fieldset")][1];
		const codex = [...(crew?.querySelectorAll("button") ?? [])].find(
			(button) => button.textContent === "codex",
		);
		yield* Effect.promise(() =>
			act(() => {
				codex?.click();
				return Promise.resolve();
			}),
		);

		expect(setCrewBackend).toHaveBeenCalledWith(
			{ backend: "codex", voyageId: reefView.id },
			expect.any(Function),
		);
		expect(setCaptainBackend).not.toHaveBeenCalled();
	}),
);
