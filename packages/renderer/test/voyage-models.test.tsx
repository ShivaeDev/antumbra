import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useAppForm } from "#forms/hook.ts";
import type { ModelCatalog } from "#hooks/backend-models.ts";
import { emptyDraft, type VoyageDraft } from "#views/open-voyage-draft.ts";
import { VoyageFields } from "#views/open-voyage-fields.tsx";
import { EMPTY_PLACEHOLDER, type RoleDraft, type RolePlaceholder } from "#views/role-settings.ts";

const claudeModels: ModelCatalog = {
	choices: [
		{ efforts: ["low", "medium"], id: "sonnet", isDefault: true, name: "Sonnet" },
		{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
	],
	failure: null,
};

const codexModels: ModelCatalog = { choices: [{ efforts: ["high"], id: "gpt-5-codex", isDefault: true, name: "GPT-5 Codex" }], failure: null };

const draftOf = (captain: Partial<RoleDraft>, crew: Partial<RoleDraft>): VoyageDraft => ({
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

const Fields = ({
	captainCatalog,
	captainPlaceholder,
	crewCatalog,
	draft,
}: {
	readonly captainCatalog: ModelCatalog;
	readonly captainPlaceholder: RolePlaceholder;
	readonly crewCatalog: ModelCatalog;
	readonly draft: VoyageDraft;
}) => {
	const form = useAppForm({ defaultValues: draft });
	return (
		<VoyageFields
			backends={["claude", "codex"]}
			captainCatalog={captainCatalog}
			captainPlaceholder={captainPlaceholder}
			crewCatalog={crewCatalog}
			crewPlaceholder={EMPTY_PLACEHOLDER}
			fields={{ captain: "captain", context: "context", crew: "crew", name: "name", northStar: "northStar" }}
			form={form}
		/>
	);
};

const shown = (captainCatalog: ModelCatalog, crewCatalog: ModelCatalog, draft: VoyageDraft, captainPlaceholder = EMPTY_PLACEHOLDER) =>
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
		yield* settle(() =>
			root.render(<Fields captainCatalog={captainCatalog} captainPlaceholder={captainPlaceholder} crewCatalog={crewCatalog} draft={draft} />),
		);
		return container;
	});

const offered = (container: HTMLElement): ReadonlyArray<ReadonlyArray<string>> =>
	[...container.querySelectorAll("datalist")].map((list) => [...list.querySelectorAll("option")].map((option) => option.value));

const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

const fieldNamed = (container: HTMLElement, name: string): HTMLInputElement | null =>
	container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

it.effect("each role offers the models of its own backend and the efforts of its own model", () =>
	Effect.gen(function* () {
		const container = yield* shown(
			claudeModels,
			codexModels,
			draftOf({ backend: "claude", model: "sonnet" }, { backend: "codex", model: "gpt-5-codex" }),
		);

		expect(offered(container)).toEqual([["sonnet", "opus"], ["low", "medium"], ["gpt-5-codex"], ["high"]]);
	}),
);

it.effect("a role that names no model is offered the efforts of the model its backend would pick", () =>
	Effect.gen(function* () {
		const container = yield* shown(claudeModels, codexModels, emptyDraft);

		expect(offered(container)).toEqual([["sonnet", "opus"], ["low", "medium"], ["gpt-5-codex"], ["high"]]);
	}),
);

it.effect("a role offers the efforts of the model the fleet's default names", () =>
	Effect.gen(function* () {
		const container = yield* shown(claudeModels, codexModels, emptyDraft, { backend: "claude", effort: "high", model: "opus" });

		expect(offered(container).at(1)).toEqual(["high", "max"]);
	}),
);

it.effect("the form takes a model the list lacks", () =>
	Effect.gen(function* () {
		const container = yield* shown(claudeModels, claudeModels, emptyDraft);
		const model = fieldNamed(container, "Crew model");

		yield* settle(() => {
			if (model === null) {
				return;
			}
			nativeValue?.call(model, "a-model-nobody-listed");
			model.dispatchEvent(new Event("input", { bubbles: true }));
		});

		expect(model?.value).toBe("a-model-nobody-listed");
	}),
);

it.effect("a backend that cannot list its models still leaves that role's fields to type in", () =>
	Effect.gen(function* () {
		const container = yield* shown({ choices: [], failure: "claude: no executable found" }, codexModels, emptyDraft);

		expect(container.textContent).toContain("Captain models could not be listed: claude: no executable found");
		expect(fieldNamed(container, "Captain model")?.value).toBe("");
		expect(offered(container)).toEqual([[], [], ["gpt-5-codex"], ["high"]]);
	}),
);
