import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ModelCatalog } from "#hooks/backend-models.ts";
import { type AgentDraft, emptyDraft, type VoyageDraft, withPresetModel } from "#views/open-voyage-draft.ts";
import { VoyageFields } from "#views/open-voyage-fields.tsx";

const claudeModels: ModelCatalog = {
	choices: [
		{ efforts: ["low", "medium"], id: "sonnet", isDefault: true, name: "Sonnet" },
		{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
	],
	failure: null,
};

const codexModels: ModelCatalog = { choices: [{ efforts: ["high"], id: "gpt-5-codex", isDefault: true, name: "GPT-5 Codex" }], failure: null };

const draftOf = (captain: Partial<AgentDraft>, crew: Partial<AgentDraft>): VoyageDraft => ({
	...emptyDraft,
	captain: { ...emptyDraft.captain, ...captain },
	crew: { ...emptyDraft.crew, ...crew },
});

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const shown = (captainCatalog: ModelCatalog, crewCatalog: ModelCatalog, draft: VoyageDraft, onChange: (draft: VoyageDraft) => void) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* settle(() =>
			root.render(
				<VoyageFields backends={["claude", "codex"]} captainCatalog={captainCatalog} crewCatalog={crewCatalog} draft={draft} onChange={onChange} />,
			),
		);
		return container;
	});

const offered = (container: HTMLElement): ReadonlyArray<ReadonlyArray<string>> =>
	[...container.querySelectorAll("datalist")].map((list) => [...list.querySelectorAll("option")].map((option) => option.value));

// React controlled inputs observe the prototype value setter.
const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

const fieldNamed = (container: HTMLElement, name: string): HTMLInputElement | null =>
	container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

it.effect("each role offers the models of its own backend and the efforts of its own model", () =>
	Effect.gen(function* () {
		const container = yield* shown(
			claudeModels,
			codexModels,
			draftOf({ backend: "claude", model: "sonnet" }, { backend: "codex", model: "gpt-5-codex" }),
			() => undefined,
		);

		expect(offered(container)).toEqual([["sonnet", "opus"], ["low", "medium"], ["gpt-5-codex"], ["high"]]);
	}),
);

it.effect("the form takes a model the list lacks", () =>
	Effect.gen(function* () {
		const drafts: Array<VoyageDraft> = [];
		const container = yield* shown(claudeModels, claudeModels, emptyDraft, (draft) => drafts.push(draft));
		const model = fieldNamed(container, "Crew model");

		yield* settle(() => {
			if (model === null) {
				return;
			}
			nativeValue?.call(model, "a-model-nobody-listed");
			model.dispatchEvent(new Event("input", { bubbles: true }));
		});

		expect(drafts.at(-1)?.crew.model).toBe("a-model-nobody-listed");
	}),
);

it.effect("a backend that cannot list its models still leaves that role's fields to type in", () =>
	Effect.gen(function* () {
		const container = yield* shown({ choices: [], failure: "claude: no executable found" }, codexModels, emptyDraft, () => undefined);

		expect(container.textContent).toContain("Captain models could not be listed: claude: no executable found");
		expect(fieldNamed(container, "Captain model")?.value).toBe("");
		expect(offered(container)).toEqual([[], [], ["gpt-5-codex"], []]);
	}),
);

it("the model a backend marks as its own default is the one the role starts with", () => {
	expect(withPresetModel(emptyDraft.captain, "sonnet")).toMatchObject({ model: "sonnet" });
	expect(withPresetModel({ backend: "claude", effort: "", model: "opus" }, "sonnet")).toMatchObject({ model: "opus" });
});
