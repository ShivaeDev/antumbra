import type { ModelChoice } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { OpenVoyageForm } from "#views/open-voyage-form.tsx";

const { backendModels, openVoyage } = vi.hoisted(() => ({ backendModels: vi.fn(), openVoyage: vi.fn() }));
vi.mock("#adapters/trpc.ts", () => ({ backendModels }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ openVoyage }));

const listed: Record<string, ReadonlyArray<ModelChoice>> = {
	claude: [
		{ efforts: ["low", "medium"], id: "sonnet", isDefault: true, name: "Sonnet" },
		{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
	],
	codex: [{ efforts: ["high"], id: "gpt-5-codex", isDefault: true, name: "GPT-5 Codex" }],
};

beforeEach(() => {
	openVoyage.mockReset();
	backendModels.mockReset();
	backendModels.mockImplementation((backend: string, onModels: (choices: ReadonlyArray<ModelChoice>) => void) => {
		onModels(listed[backend] ?? []);
	});
});

const settle = (change: () => void) =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

const named = (name: string): HTMLInputElement | null => document.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

const labelled = (label: string): HTMLInputElement | null => {
	const forId = [...document.querySelectorAll("label")].find((node) => node.textContent === label)?.getAttribute("for");
	return document.querySelector<HTMLInputElement>(`input[id="${forId}"]`);
};

const write = (element: HTMLInputElement | null, value: string) => {
	if (element === null) return;
	nativeValue?.call(element, value);
	element.dispatchEvent(new Event("input", { bubbles: true }));
};

const suggested = (name: string): ReadonlyArray<string> => {
	const list = named(name)?.getAttribute("list");
	return [...(document.getElementById(list ?? "")?.querySelectorAll("option") ?? [])].map((option) => option.value);
};

const buttonSaying = (words: string): HTMLButtonElement | undefined =>
	[...(document.querySelector('[data-slot="dialog-content"]') ?? document.body).querySelectorAll("button")].find(
		(entry) => entry.textContent === words,
	);

const keyed = (target: Element | null | undefined, key: string) => {
	target?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
};

const choose = (name: string, backend: string) =>
	Effect.gen(function* () {
		yield* settle(() => keyed(document.querySelector(`[aria-label="${name}"]`), "ArrowDown"));
		yield* settle(() =>
			keyed(
				[...document.querySelectorAll('[role="option"]')].find((option) => option.textContent === backend),
				"Enter",
			),
		);
	});

const shown = (backends: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			settle(() => {
				root.unmount();
				container.remove();
			}),
		);
		yield* settle(() => root.render(<OpenVoyageForm backends={backends} onError={() => undefined} onOpened={() => undefined} />));
		yield* settle(() => buttonSaying("Open voyage")?.click());
		yield* settle(() => {
			write(labelled("Name"), "Reef survey");
			write(labelled("North star"), "The reef is charted");
		});
	});

it.effect(
	"opens the voyage on the backend, model and effort each role was given",
	Effect.fnUntraced(function* () {
		yield* shown(["claude", "codex"]);

		yield* choose("Crew backend", "codex");
		yield* settle(() => write(named("Captain model"), "opus"));
		yield* settle(() => write(named("Captain effort"), "max"));

		expect(suggested("Crew model")).toEqual(["gpt-5-codex"]);
		expect(suggested("Captain effort")).toEqual(["high", "max"]);

		yield* settle(() => buttonSaying("Open voyage")?.click());

		expect(openVoyage.mock.calls.at(0)?.at(0)).toEqual({
			backend: "claude",
			captainBackend: "claude",
			captainEffort: "max",
			captainModel: "opus",
			context: "",
			crewBackend: "codex",
			crewModel: "gpt-5-codex",
			name: "Reef survey",
			northStar: "The reef is charted",
		});
	}),
);

it.effect(
	"leaves a role's model and effort out of the request when the admiral names neither",
	Effect.fnUntraced(function* () {
		yield* shown(["claude", "codex"]);

		yield* settle(() => write(named("Captain model"), ""));
		yield* settle(() => write(named("Crew model"), ""));
		yield* settle(() => buttonSaying("Open voyage")?.click());

		expect(openVoyage.mock.calls.at(0)?.at(0)).toEqual({
			backend: "claude",
			captainBackend: "claude",
			context: "",
			crewBackend: "claude",
			name: "Reef survey",
			northStar: "The reef is charted",
		});
	}),
);
