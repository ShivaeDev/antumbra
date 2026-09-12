import { models } from "@antumbra/domain-backends/queries/models.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, many, titled } from "@antumbra/platform-feature/edit.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import type { ReactNode } from "react";
import { CommandForm } from "#form.tsx";
import { type Desk, desk } from "#test/desk.ts";
import { choose, mount, settle, until } from "#test/dom.ts";

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

const ROW = { backend: "codex", key: "crew", models: ["codex/gpt"] };

const shown = (board: Desk, screen: ReactNode) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(<board.glass.Provider>{screen}</board.glass.Provider>));
		yield* until(() => container.querySelectorAll("form").length > 0);
		return container;
	});

const labelled = (container: HTMLElement, label: string): HTMLSelectElement =>
	container.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

const saving = (container: HTMLElement) => settle(() => container.querySelector("button")?.click());

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

it.live("draws the values a fixed field's query lists and sends the several a reader picks", () =>
	Effect.gen(function* () {
		const board = desk();
		const sent: Record<string, unknown>[] = [];
		const container = yield* shown(board, <CommandForm command={answering(sent, crew)} fixed={FIXED} submit="Crew" />);
		const control = labelled(container, "Crew Models");

		expect(control.tagName).toBe("SELECT");
		expect(control.multiple).toBe(true);
		yield* until(() => control.options.length === 2);
		expect([...control.options].map((option) => option.textContent)).toEqual(["GPT", "GPT mini"]);

		yield* settle(() => choose(control, ["codex/gpt", "codex/gpt-mini"]));
		yield* saving(container);

		yield* until(() => sent.length === 1);
		expect(sent[0]).toEqual({ backend: "codex", models: ["codex/gpt", "codex/gpt-mini"] });
	}),
);

it.live("marks what the row already holds and sends the list it is rewired to", () =>
	Effect.gen(function* () {
		const board = desk();
		const sent: Record<string, unknown>[] = [];
		const container = yield* shown(board, <CommandForm command={answering(sent, rewire)} row={ROW} />);
		const control = labelled(container, "Models");

		yield* until(() => control.options.length === 2);
		expect(marked(control)).toEqual(["codex/gpt"]);

		yield* settle(() => choose(control, ["codex/gpt-mini"]));
		yield* saving(container);

		yield* until(() => sent.length === 1);
		expect(sent[0]).toEqual({ key: "crew", models: ["codex/gpt-mini"] });
	}),
);
