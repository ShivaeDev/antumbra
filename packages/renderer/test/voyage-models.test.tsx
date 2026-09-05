import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ModelCatalog } from "#hooks/backend-models.ts";
import { emptyDraft, type VoyageDraft, VoyageFields, withPresetModels } from "#views/open-voyage-fields.tsx";

const listed: ModelCatalog = {
	choices: [
		{ efforts: ["low", "medium"], id: "sonnet", isDefault: true, name: "Sonnet" },
		{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
	],
	failure: null,
};

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const shown = (catalog: ModelCatalog, draft: VoyageDraft, onChange: (draft: VoyageDraft) => void) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* settle(() => root.render(<VoyageFields backends={["claude"]} catalog={catalog} draft={draft} onChange={onChange} />));
		return container;
	});

const offered = (container: HTMLElement): ReadonlyArray<ReadonlyArray<string>> =>
	[...container.querySelectorAll("datalist")].map((list) => [...list.querySelectorAll("option")].map((option) => option.value));

// React controlled inputs observe the prototype value setter.
const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

const fieldNamed = (container: HTMLElement, label: string): HTMLInputElement | null => {
	const forId = [...container.querySelectorAll("label")].find((node) => node.textContent === label)?.getAttribute("for");
	return container.querySelector<HTMLInputElement>(`input[id="${forId}"]`);
};

it.effect("the form offers the listed models and the efforts the chosen one allows", () =>
	Effect.gen(function* () {
		const container = yield* shown(listed, { ...emptyDraft, captainModel: "sonnet" }, () => undefined);

		expect(offered(container)).toEqual([["sonnet", "opus"], ["low", "medium"], ["sonnet", "opus"], []]);
	}),
);

it.effect("the form takes a model the list lacks", () =>
	Effect.gen(function* () {
		const drafts: Array<VoyageDraft> = [];
		const container = yield* shown(listed, emptyDraft, (draft) => drafts.push(draft));
		const model = fieldNamed(container, "Crew model");

		yield* settle(() => {
			if (model === null) {
				return;
			}
			nativeValue?.call(model, "a-model-nobody-listed");
			model.dispatchEvent(new Event("input", { bubbles: true }));
		});

		expect(drafts.at(-1)?.crewModel).toBe("a-model-nobody-listed");
	}),
);

it.effect("a backend that cannot list its models still leaves the fields to type in", () =>
	Effect.gen(function* () {
		const container = yield* shown({ choices: [], failure: "claude: no executable found" }, emptyDraft, () => undefined);

		expect(container.textContent).toContain("claude: no executable found");
		expect(fieldNamed(container, "Captain model")?.value).toBe("");
	}),
);

it("the model a backend marks as its own default is the one the form starts with", () => {
	expect(withPresetModels(emptyDraft, "sonnet")).toMatchObject({ captainModel: "sonnet", crewModel: "sonnet" });
	expect(withPresetModels({ ...emptyDraft, captainModel: "opus" }, "sonnet")).toMatchObject({ captainModel: "opus", crewModel: "" });
});
