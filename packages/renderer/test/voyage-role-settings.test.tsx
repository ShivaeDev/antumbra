import type { Fleet } from "@antumbra/contract";
import { fleet as fleetFixture, reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { VoyageHeader } from "#views/voyage-header.tsx";

const { backendModels, setAgentSettings } = vi.hoisted(() => ({ backendModels: vi.fn(), setAgentSettings: vi.fn() }));
vi.mock("#adapters/trpc-costs.ts", () => ({ watchCosts: vi.fn(() => vi.fn()) }));
vi.mock("#adapters/trpc.ts", () => ({ backendModels }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ focusVoyage: vi.fn(), hailCaptain: vi.fn(), setAgentSettings }));

const fleet: Fleet = {
	...fleetFixture,
	backends: ["claude", "codex"],
	roleSettings: [{ backend: "codex", effort: "medium", model: "gpt-5-codex", role: "crew" }],
};

const voyage = { ...reefView, crewSettings: { backend: null, effort: null, model: null } };

beforeEach(() => {
	setAgentSettings.mockReset();
	setAgentSettings.mockReturnValue(Effect.void);
	backendModels.mockReset();
	backendModels.mockImplementation((_backend: string, onModels: (choices: ReadonlyArray<never>) => void) => {
		onModels([]);
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

const shown = Effect.gen(function* () {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	yield* Effect.addFinalizer(() =>
		settle(() => {
			root.unmount();
			container.remove();
		}),
	);
	yield* settle(() => root.render(<VoyageHeader fleet={fleet} onError={() => undefined} voyage={voyage} />));
	return container;
});

const named = (container: HTMLElement, name: string): HTMLInputElement | null =>
	container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

const write = (element: HTMLInputElement | null, value: string) => {
	if (element === null) return;
	nativeValue?.call(element, value);
	element.dispatchEvent(new Event("input", { bubbles: true }));
};

const saveButton = (container: HTMLElement): HTMLButtonElement | undefined =>
	[...container.querySelectorAll("button")].find((button) => button.textContent === "Save");

it.effect(
	"shows what each role sails on and what it takes from the fleet",
	Effect.fnUntraced(function* () {
		const container = yield* shown;

		expect(named(container, "Captain model")?.value).toBe("claude-opus-4-6");
		expect(container.querySelector('[aria-label="Captain backend"]')?.textContent).toContain("claude");
		expect(named(container, "Crew model")?.value).toBe("");
		expect(named(container, "Crew model")?.placeholder).toBe("gpt-5-codex");
		expect(container.querySelector('[aria-label="Crew backend"]')?.textContent).toContain("codex");
		expect(saveButton(container)?.disabled).toBe(true);
	}),
);

it.effect(
	"writes only the role the admiral moved",
	Effect.fnUntraced(function* () {
		const container = yield* shown;

		yield* settle(() => write(named(container, "Crew model"), "gpt-5"));
		yield* settle(() => saveButton(container)?.click());

		expect(setAgentSettings.mock.calls.map((call) => call.at(0))).toEqual([
			{ backend: null, effort: null, model: "gpt-5", role: "crew", voyageId: reefView.id },
		]);
	}),
);

it.effect("keeps the draft and says why when a role's settings cannot be set", () =>
	Effect.gen(function* () {
		const attempt = yield* Deferred.make<void, RendererRequestError>();
		const started = yield* Deferred.make<void>();
		setAgentSettings.mockReturnValueOnce(Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(attempt))));
		const container = yield* shown;

		yield* settle(() => write(named(container, "Crew effort"), " high "));
		yield* settle(() => container.querySelector("form")?.requestSubmit());
		yield* Deferred.await(started);

		expect(named(container, "Crew effort")?.closest("fieldset")?.disabled).toBe(true);
		expect([...container.querySelectorAll("button")].some((button) => button.textContent === "Saving…")).toBe(true);

		yield* settle(() => {
			Effect.runSync(Deferred.fail(attempt, new RendererRequestError({ message: "Voyage unavailable" })));
		});

		expect(container.querySelector('[role="alert"]')?.textContent).toContain("Voyage unavailable");
		expect(named(container, "Crew effort")?.value).toBe(" high ");
	}),
);
