import type { Fleet } from "@antumbra/contract";
import { fleet as fleetFixture, reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { mount, settle, write } from "#test/dom.ts";
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

const shown = Effect.gen(function* () {
	const { container, root } = yield* mount();
	yield* settle(() => root.render(<VoyageHeader fleet={fleet} onError={() => undefined} voyage={voyage} />));
	return { container, root };
});

const named = (container: HTMLElement, name: string): HTMLInputElement => {
	const input = container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);
	if (input === null) return Effect.runSync(Effect.die(`Missing field ${name}`));
	return input;
};

const saveButton = (container: HTMLElement): HTMLButtonElement | undefined =>
	[...container.querySelectorAll("button")].find((button) => button.textContent === "Save");

it.effect(
	"shows what each role sails on and what it takes from the fleet",
	Effect.fnUntraced(function* () {
		const { container } = yield* shown;

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
		const { container } = yield* shown;

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
		const { container } = yield* shown;

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

it.effect("retains the other role's edit and request error when a saved role refreshes", () =>
	Effect.gen(function* () {
		const pending = yield* Deferred.make<void, RendererRequestError>();
		const started = yield* Deferred.make<void>();
		setAgentSettings.mockReturnValueOnce(Effect.void);
		setAgentSettings.mockReturnValueOnce(Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(pending))));
		const { container, root } = yield* shown;
		yield* settle(() => {
			write(named(container, "Captain effort"), "medium");
			write(named(container, "Crew effort"), " high ");
		});
		yield* settle(() => container.querySelector("form")?.requestSubmit());
		yield* Deferred.await(started);
		const refreshed = { ...voyage, captainSettings: { ...voyage.captainSettings, effort: "medium" } };
		yield* settle(() => root.render(<VoyageHeader fleet={fleet} onError={() => undefined} voyage={refreshed} />));
		expect(named(container, "Crew effort")?.value).toBe(" high ");
		expect(named(container, "Crew effort")?.closest("fieldset")?.disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.fail(pending, new RendererRequestError({ message: "Crew unavailable" })));
		});
		expect(container.querySelector('[role="alert"]')?.textContent).toContain("Crew unavailable");
		expect(named(container, "Crew effort")?.value).toBe(" high ");
		yield* settle(() => container.querySelector("form")?.requestSubmit());
		expect(setAgentSettings.mock.calls.map((call) => call.at(0)?.role)).toEqual(["captain", "crew", "crew"]);
	}),
);

it.effect("refreshes untouched saved settings and starts a new draft when the voyage changes", () =>
	Effect.gen(function* () {
		const { container, root } = yield* shown;
		const refreshed = { ...voyage, crewSettings: { backend: "codex", model: "saved-model", effort: "high" } };
		yield* settle(() => root.render(<VoyageHeader fleet={fleet} onError={() => undefined} voyage={refreshed} />));
		expect(named(container, "Crew model")?.value).toBe("saved-model");
		expect(saveButton(container)?.disabled).toBe(true);
		yield* settle(() => write(named(container, "Crew model"), "unsaved-model"));
		yield* settle(() => root.render(<VoyageHeader fleet={fleet} onError={() => undefined} voyage={{ ...refreshed, id: "other-voyage" }} />));
		expect(named(container, "Crew model")?.value).toBe("saved-model");
		expect(saveButton(container)?.disabled).toBe(true);
	}),
);
