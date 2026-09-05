import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RoleDefaults } from "#views/role-defaults.tsx";

const { backendModels, setRoleSettings } = vi.hoisted(() => ({ backendModels: vi.fn(), setRoleSettings: vi.fn() }));
vi.mock("#adapters/trpc.ts", () => ({ backendModels, setRoleSettings }));

beforeEach(() => {
	setRoleSettings.mockReset();
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
	yield* settle(() => root.render(<RoleDefaults backends={["claude", "codex"]} defaults={[]} onError={() => undefined} />));
	return container;
});

const named = (container: HTMLElement, name: string): HTMLInputElement | null =>
	container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

const saveButton = (container: HTMLElement): HTMLButtonElement | undefined =>
	[...container.querySelectorAll("button")].find((button) => button.textContent === "Save");

it.effect(
	"offers a row per role and falls to the first backend until one is named",
	Effect.fnUntraced(function* () {
		const container = yield* shown;

		expect([...container.querySelectorAll('th[scope="row"]')].map((cell) => cell.textContent)).toEqual(["Flagship", "Captain", "Crew"]);
		expect(container.querySelector('[aria-label="Flagship backend"]')?.textContent).toContain("claude");
		expect(named(container, "Flagship model")?.placeholder).toBe("the backend's own");
		expect(saveButton(container)?.disabled).toBe(true);
	}),
);

it.effect(
	"writes the fleet's default for the role the admiral moved",
	Effect.fnUntraced(function* () {
		const container = yield* shown;
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
