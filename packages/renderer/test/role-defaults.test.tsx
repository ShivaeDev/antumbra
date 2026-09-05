import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { RoleDefaults } from "#views/role-defaults.tsx";

const { backendModels, setRoleSettings } = vi.hoisted(() => ({ backendModels: vi.fn(), setRoleSettings: vi.fn() }));
vi.mock("#adapters/trpc.ts", () => ({ backendModels, setRoleSettings }));

beforeEach(() => {
	setRoleSettings.mockReset();
	setRoleSettings.mockReturnValue(Effect.void);
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
	yield* settle(() => root.render(<RoleDefaults backends={["claude", "codex"]} defaults={[]} />));
	return { container, root };
});

const named = (container: HTMLElement, name: string): HTMLInputElement | null =>
	container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

const saveButton = (container: HTMLElement): HTMLButtonElement | undefined =>
	[...container.querySelectorAll("button")].find((button) => button.textContent === "Save");

it.effect(
	"offers a row per role and falls to the first backend until one is named",
	Effect.fnUntraced(function* () {
		const { container } = yield* shown;

		expect([...container.querySelectorAll("span.text-xs")].map((cell) => cell.textContent)).toEqual(["Flagship", "Captain", "Crew"]);
		expect(container.querySelector('[aria-label="Flagship backend"]')?.textContent).toContain("claude");
		expect(named(container, "Flagship model")?.placeholder).toBe("the backend's own");
		expect(saveButton(container)?.disabled).toBe(true);
	}),
);

it.effect(
	"writes the fleet's default for the role the admiral moved",
	Effect.fnUntraced(function* () {
		const { container } = yield* shown;
		const model = named(container, "Flagship model");

		yield* settle(() => {
			if (model === null) {
				return;
			}
			nativeValue?.call(model, "opus");
			model.dispatchEvent(new Event("input", { bubbles: true }));
		});
		expect(saveButton(container)?.disabled).toBe(false);
		yield* settle(() => saveButton(container)?.click());

		expect(setRoleSettings.mock.calls.map((call) => call.at(0))).toEqual([{ backend: null, effort: null, model: "opus", role: "flagship" }]);
	}),
);

it.effect("keeps unsaved role drafts when another role's saved update arrives during a failed batch", () =>
	Effect.gen(function* () {
		const pending = yield* Deferred.make<void, RendererRequestError>();
		const started = yield* Deferred.make<void>();
		setRoleSettings.mockReturnValueOnce(Effect.void);
		setRoleSettings.mockReturnValueOnce(Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(pending))));
		const { container, root } = yield* shown;
		yield* settle(() => {
			for (const role of ["Flagship", "Crew"]) {
				const input = named(container, `${role} model`);
				nativeValue?.call(input, `${role}-model`);
				input?.dispatchEvent(new Event("input", { bubbles: true }));
			}
		});
		yield* settle(() => container.querySelector("form")?.requestSubmit());
		yield* Deferred.await(started);
		const flagship = { role: "flagship" as const, backend: null, effort: null, model: "Flagship-model" };
		yield* settle(() => root.render(<RoleDefaults backends={["claude", "codex"]} defaults={[flagship]} />));
		expect(named(container, "Crew model")?.value).toBe("Crew-model");
		expect(named(container, "Crew model")?.closest("fieldset")?.disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.fail(pending, new RendererRequestError({ message: "Crew unavailable" })));
		});
		expect(container.querySelector('[role="alert"]')?.textContent).toContain("Crew unavailable");
		expect(named(container, "Crew model")?.value).toBe("Crew-model");
		yield* settle(() => container.querySelector("form")?.requestSubmit());
		expect(setRoleSettings.mock.calls.map((call) => call.at(0)?.role)).toEqual(["flagship", "crew", "crew"]);
	}),
);

it.effect("refreshes an untouched form from saved defaults", () =>
	Effect.gen(function* () {
		const { container, root } = yield* shown;
		yield* settle(() =>
			root.render(
				<RoleDefaults backends={["claude", "codex"]} defaults={[{ role: "crew", backend: "codex", model: "saved-model", effort: "high" }]} />,
			),
		);
		expect(named(container, "Crew model")?.value).toBe("saved-model");
		expect(named(container, "Crew effort")?.value).toBe("high");
		expect(saveButton(container)?.disabled).toBe(true);
	}),
);
