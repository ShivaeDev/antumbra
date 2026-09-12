import type { Glass } from "@antumbra/glass-client/connect.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import { expect } from "@effect/vitest";
import { Option, Stream } from "effect";
import type { definition } from "#application.ts";
import { labelled, settle, submit, until, write } from "#test/glass/dom.ts";
import { it } from "#test/glass/entry.tsx";

const FIXED = ["role"] as const;
const PLACEHOLDERS = { backend: "Default", effort: "Backend default", model: "Backend default" };

const Board = (props: { readonly api: Glass<typeof definition.features>["api"] }) => (
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
	yield* until(() => container.querySelectorAll("form").length === 4);
	expect([...labelled<HTMLSelectElement>(container, "Flagship Backend").options].map((option) => option.value)).toEqual([
		"",
		"claude",
		"codex",
		"opencode",
		"pi",
	]);
});

it.glass("offers models from the backend selected in the form", function* ({ api, render }) {
	yield* api.backends.listModels({
		backend: "claude",
		failure: null,
		models: [{ model: "opus", name: "Opus", efforts: ["low", "high"], isDefault: true }],
	});
	yield* api.backends.listModels({
		backend: "codex",
		failure: null,
		models: [
			{ model: "gpt", name: "GPT", efforts: ["medium"], isDefault: true },
			{ model: "gpt-mini", name: "GPT mini", efforts: ["medium", "high"], isDefault: false },
		],
	});
	const container = yield* render(<Board api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 4);
	yield* settle(() => write(labelled<HTMLSelectElement>(container, "Flagship Backend"), "claude"));
	yield* until(() => offered(container, "Flagship Model").length === 1);
	expect(offered(container, "Flagship Model")).toEqual(["opus"]);
	yield* settle(() => write(labelled<HTMLSelectElement>(container, "Flagship Backend"), "codex"));
	yield* until(() => offered(container, "Flagship Model").length === 2);
	expect(offered(container, "Flagship Model")).toEqual(["gpt", "gpt-mini"]);
});

it.glass("saves a model absent from the catalogue", function* ({ api, render }) {
	const container = yield* render(<Board api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 4);
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Captain Model"), "gpt-6-astra"));
	yield* submit(container, 1);
	const saved = Option.getOrThrow(
		yield* api.roleSettings.defaults({}).pipe(
			Stream.filter((rows) => rows.some((row) => row.role === "captain" && row.model === "gpt-6-astra")),
			Stream.runHead,
		),
	);
	expect(saved.find((row) => row.role === "captain")).toMatchObject({ model: "gpt-6-astra", scope: "fleet" });
});

it.glass("saves the changed row and settles clean", function* ({ api, render }) {
	const container = yield* render(<Board api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 4);
	const save = () => container.querySelector("form button");
	expect(save()).toHaveProperty("disabled", true);
	yield* settle(() => write(labelled<HTMLSelectElement>(container, "Flagship Backend"), "claude"));
	expect(save()).toHaveProperty("disabled", false);
	yield* submit(container, 0);
	const saved = Option.getOrThrow(
		yield* api.roleSettings.defaults({}).pipe(
			Stream.filter((rows) => rows.some((row) => row.role === "flagship" && row.backend === "claude")),
			Stream.runHead,
		),
	);
	expect(saved.find((row) => row.role === "flagship")).toMatchObject({ backend: "claude", effort: null, model: null, scope: "fleet" });
	yield* until(() => container.querySelector<HTMLButtonElement>("form button")?.disabled === true);
});

it.glass("saves an empty optional choice as null", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: "gpt", role: "crew", scope: "fleet" });
	const container = yield* render(<Board api={api} />);
	yield* until(() => container.querySelector<HTMLInputElement>('[aria-label="Crew Model"]')?.value === "gpt");
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Crew Model"), ""));
	yield* submit(container, 2);
	const saved = Option.getOrThrow(
		yield* api.roleSettings.defaults({}).pipe(
			Stream.filter((rows) => rows.some((row) => row.role === "crew" && row.model === null)),
			Stream.runHead,
		),
	);
	expect(saved.find((row) => row.role === "crew")).toMatchObject({ backend: "codex", model: null });
});
