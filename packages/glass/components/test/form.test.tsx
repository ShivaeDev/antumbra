import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, form, labelled, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import { expect } from "@effect/vitest";
import { CommandForm } from "#form.tsx";

const FIXED = ["role"] as const;
const PLACEHOLDERS = { backend: "Default", effort: "Backend default", model: "Backend default" };

const Board = (props: { readonly api: Api }) => (
	<Live input={{}} query={props.api.roleSettings.defaults}>
		{(rows) =>
			rows.map((row) => <CommandForm command={props.api.roleSettings.choose} fixed={FIXED} key={row.id} placeholders={PLACEHOLDERS} row={row} />)
		}
	</Live>
);

const offered = (container: HTMLElement, label: string): readonly string[] => {
	const list = document.getElementById(labelled<HTMLInputElement>(container, label).getAttribute("list") ?? "");
	return [...(list?.querySelectorAll("option") ?? [])].map((option) => option.value);
};

it.glass("draws the choices allowed by the command schema", function* ({ api, render }) {
	const container = yield* render(<Board api={api} />);
	yield* renderedForm(container, "Flagship");
	expect([...labelled<HTMLSelectElement>(container, "Flagship Backend").options].map((option) => option.value)).toEqual([
		"",
		"claude",
		"codex",
		"opencode",
		"pi",
	]);
});

it.glass("clears dependent choices when the backend changes", function* ({ api, render }) {
	yield* api.backends.listModels({
		backend: "claude",
		failure: null,
		models: [{ model: "opus", name: "Opus", defaultEffort: "high", efforts: ["low", "high"], isDefault: true }],
	});
	yield* api.backends.listModels({
		backend: "codex",
		failure: null,
		models: [
			{ model: "gpt", name: "GPT", defaultEffort: "medium", efforts: ["medium"], isDefault: true },
			{ model: "gpt-mini", name: "GPT mini", defaultEffort: "medium", efforts: ["medium", "high"], isDefault: false },
		],
	});
	yield* api.roleSettings.choose({ backend: "claude", model: "opus", effort: "high", role: "flagship", scope: "fleet" });
	const container = yield* render(<Board api={api} />);
	yield* renderedForm(container, "Flagship");
	expect(labelled<HTMLInputElement>(container, "Flagship Model").value).toBe("opus");
	expect(labelled<HTMLInputElement>(container, "Flagship Effort").value).toBe("high");
	yield* until(() => offered(container, "Flagship Model").length === 1, "the Claude model option to appear");
	expect(offered(container, "Flagship Model")).toEqual(["opus"]);
	yield* fill(container, "Flagship Backend", "codex");
	yield* until(() => offered(container, "Flagship Model").length === 2, "both Codex model options to appear");
	expect(offered(container, "Flagship Model")).toEqual(["gpt", "gpt-mini"]);
	expect(labelled<HTMLInputElement>(container, "Flagship Model").value).toBe("");
	expect(labelled<HTMLInputElement>(container, "Flagship Effort").value).toBe("");
	yield* submit(container, "Flagship");
	const saved = yield* eventually(api.roleSettings.defaults({}), (rows) => rows.some((row) => row.role === "flagship" && row.backend === "codex"));
	expect(saved.find((row) => row.role === "flagship")).toMatchObject({ backend: "codex", model: null, effort: null });
});

it.glass("saves a model absent from the catalogue", function* ({ api, render }) {
	const container = yield* render(<Board api={api} />);
	yield* renderedForm(container, "Captain");
	yield* fill(container, "Captain Model", "gpt-6-astra");
	yield* submit(container, "Captain");
	const saved = yield* eventually(api.roleSettings.defaults({}), (rows) => rows.some((row) => row.role === "captain" && row.model === "gpt-6-astra"));
	expect(saved.find((row) => row.role === "captain")).toMatchObject({ model: "gpt-6-astra", scope: "fleet" });
});

it.glass("saves the changed row and settles clean", function* ({ api, render }) {
	const container = yield* render(<Board api={api} />);
	yield* renderedForm(container, "Flagship");
	const save = () => form(container, "Flagship").querySelector<HTMLButtonElement>('button[type="submit"]');
	expect(save()).toHaveProperty("disabled", true);
	yield* fill(container, "Flagship Backend", "claude");
	expect(save()).toHaveProperty("disabled", false);
	yield* submit(container, "Flagship");
	const saved = yield* eventually(api.roleSettings.defaults({}), (rows) => rows.some((row) => row.role === "flagship" && row.backend === "claude"));
	expect(saved.find((row) => row.role === "flagship")).toMatchObject({ backend: "claude", effort: null, model: null, scope: "fleet" });
	yield* until(() => save()?.disabled === true, "Save to become disabled after saving");
});

it.glass("saves an empty optional choice as null", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: "gpt", role: "crew", scope: "fleet" });
	const container = yield* render(<Board api={api} />);
	yield* until(() => container.querySelector<HTMLInputElement>('[aria-label="Crew Model"]')?.value === "gpt", "the saved crew model to show gpt");
	yield* fill(container, "Crew Model", "");
	yield* submit(container, "Crew");
	const saved = yield* eventually(api.roleSettings.defaults({}), (rows) => rows.some((row) => row.role === "crew" && row.model === null));
	expect(saved.find((row) => row.role === "crew")).toMatchObject({ backend: "codex", model: null });
});
