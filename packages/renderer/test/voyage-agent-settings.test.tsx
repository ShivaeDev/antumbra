import type { ModelChoice, VoyageAgentSettingsRequest } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { AgentSettingsEditor } from "#views/voyage-agent-settings.tsx";

const { backendModels, setAgentSettings } = vi.hoisted(() => ({ backendModels: vi.fn(), setAgentSettings: vi.fn() }));
vi.mock("#adapters/trpc.ts", () => ({ backendModels }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ setAgentSettings }));
beforeEach(() => {
	setAgentSettings.mockReset();
	setAgentSettings.mockReturnValue(Effect.void);
	backendModels.mockReset();
	backendModels.mockImplementation((_backend: string, onModels: (models: ReadonlyArray<ModelChoice>) => void) =>
		onModels([{ id: "listed", name: "Listed model", efforts: ["high"], isDefault: true }]),
	);
});
const settle = (action: () => void) =>
	Effect.promise(() =>
		act(() => {
			action();
			return Promise.resolve();
		}),
	);
const mount = () =>
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
		return root;
	});
const input = (label: string): HTMLInputElement => {
	const field = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
	if (field === null) return Effect.runSync(Effect.die(`Missing field ${label}`));
	return field;
};
const write = (label: string, value: string) => {
	const field = input(label);
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, value);
	field.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = () => document.querySelector("form")?.requestSubmit();

it.effect.each([
	{ label: "Captain model", expected: { model: "custom", effort: null } },
	{ label: "Captain effort", expected: { model: null, effort: "custom" } },
])("accepts a manual $label after rejecting unchanged settings", ({ label, expected }) =>
	Effect.gen(function* () {
		const root = yield* mount();
		yield* settle(() =>
			root.render(<AgentSettingsEditor agentRole="captain" backend="codex" effort={null} label="Captain" model={null} voyageId="voyage" />),
		);
		expect(input("Captain model").value).toBe("");
		yield* settle(submit);
		expect(setAgentSettings).not.toHaveBeenCalled();
		yield* settle(() => write(label, " custom "));
		yield* settle(submit);
		expect(setAgentSettings).toHaveBeenCalledWith({ ...expected, role: "captain", voyageId: "voyage" });
		expect(input(label).value).toBe(" custom ");
	}),
);

it.effect("keeps failed settings editable when a backend cannot list models and preserves the retry draft", () =>
	Effect.gen(function* () {
		backendModels.mockImplementation((_backend: string, _onModels: unknown, onError: (message: string) => void) => onError("backend offline"));
		const first = yield* Deferred.make<void, RendererRequestError>();
		const second = yield* Deferred.make<void>();
		const started = yield* Deferred.make<VoyageAgentSettingsRequest>();
		const retried = yield* Deferred.make<void>();
		setAgentSettings.mockImplementationOnce((value: VoyageAgentSettingsRequest) =>
			Deferred.succeed(started, value).pipe(Effect.andThen(Deferred.await(first))),
		);
		setAgentSettings.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		const root = yield* mount();
		yield* settle(() =>
			root.render(<AgentSettingsEditor agentRole="crew" backend="codex" effort="high" label="Crew" model="listed" voyageId="voyage" />),
		);
		expect(document.body.textContent).toContain("Crew models could not be listed: backend offline");
		yield* settle(() => {
			write("Crew model", " my-model ");
			write("Crew effort", "  ");
		});
		yield* settle(submit);
		expect(yield* Deferred.await(started)).toEqual({ model: "my-model", effort: null, role: "crew", voyageId: "voyage" });
		expect(input("Crew model").closest("fieldset")?.disabled).toBe(true);
		expect(document.querySelector('[type="submit"]')?.textContent).toBe("Setting…");
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Voyage unavailable" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("Voyage unavailable");
		expect(input("Crew model").value).toBe(" my-model ");
		expect(input("Crew effort").value).toBe("  ");
		yield* settle(submit);
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, undefined));
		});
		expect(input("Crew model").value).toBe(" my-model ");
		expect(document.querySelector('[role="alert"]')).toBeNull();
	}),
);
