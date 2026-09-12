import { choose, labelled, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { models } from "@antumbra/domain-backends/queries/models.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, many, titled } from "@antumbra/platform-feature/edit.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { expect } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { CommandForm } from "#form.tsx";

const CHOSEN = titled(many(choice(models, { input: { backend: "backend" }, label: "name", value: "id" })), { title: "Models" });

const crewed = fact("Crewed", { key: Schema.String, models: Schema.Array(Schema.String) });

const crew = command("crew", {
	input: { backend: Schema.String, models: CHOSEN },
	reads: [],
	emits: crewed,
	rejections: {},
	run: (input) => Effect.succeed({ key: input.backend, models: input.models }),
});

const rewire = command("rewire", {
	input: { key: Schema.String, models: CHOSEN },
	reads: [],
	emits: crewed,
	rejections: {},
	run: (input) => Effect.succeed({ key: input.key, models: input.models }),
});

const FIXED = { backend: "codex" } as const;

const MODELS = [
	{ model: "gpt", name: "GPT", efforts: ["medium"], isDefault: true },
	{ model: "gpt-mini", name: "GPT mini", efforts: ["medium", "high"], isDefault: false },
];

const ROW = { backend: "codex", key: "crew", models: ["codex/gpt"] };

const marked = (control: HTMLSelectElement): readonly string[] =>
	[...control.options].filter((option) => option.selected).map((option) => option.value);

const answering = (sent: Record<string, unknown>[], of: typeof crew | typeof rewire) =>
	Object.assign(
		(input: Record<string, unknown>) => {
			sent.push(input);
			return Effect.succeed(sent.length);
		},
		{ command: of },
	);

it.glass("submits several selected models", function* ({ api, render }) {
	yield* api.backends.listModels({ backend: "codex", failure: null, models: MODELS });
	const sent: Record<string, unknown>[] = [];
	const container = yield* render(<CommandForm command={answering(sent, crew)} fixed={FIXED} submit="Crew" />);
	yield* renderedForm(container, "Crew");
	const control = labelled<HTMLSelectElement>(container, "Crew Models");

	expect(control.tagName).toBe("SELECT");
	expect(control.multiple).toBe(true);
	yield* until(() => control.options.length === 2);
	expect([...control.options].map((option) => option.textContent)).toEqual(["GPT", "GPT mini"]);

	yield* choose(control, ["codex/gpt", "codex/gpt-mini"]);
	yield* submit(container, "Crew");

	yield* until(() => sent.length === 1);
	expect(sent[0]).toEqual({ backend: "codex", models: ["codex/gpt", "codex/gpt-mini"] });
});

it.glass("replaces the selected models", function* ({ api, render }) {
	yield* api.backends.listModels({ backend: "codex", failure: null, models: MODELS });
	const sent: Record<string, unknown>[] = [];
	const container = yield* render(<CommandForm command={answering(sent, rewire)} label="Model selection" row={ROW} />);
	yield* renderedForm(container, "Model selection");
	const control = labelled<HTMLSelectElement>(container, "Model selection Models");

	yield* until(() => control.options.length === 2);
	expect(marked(control)).toEqual(["codex/gpt"]);

	yield* choose(control, ["codex/gpt-mini"]);
	yield* submit(container, "Model selection");

	yield* until(() => sent.length === 1);
	expect(sent[0]).toEqual({ key: "crew", models: ["codex/gpt-mini"] });
});
