import { choose } from "@antumbra/domain-role-settings/commands/choose.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { command } from "@antumbra/platform-feature/command.ts";
import { optional, titled } from "@antumbra/platform-feature/edit.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Schema, SubscriptionRef } from "effect";
import type { ReactNode } from "react";
import { CommandForm } from "#form.tsx";
import { type Desk, desk } from "#test/desk.ts";
import { mount, settle, until, write } from "#test/dom.ts";

const FIXED = ["role"] as const;

const PLACEHOLDERS = { backend: "Default", effort: "Backend default", model: "Backend default" };

type Api = Desk["glass"]["api"];

const Board = (props: { readonly api: Api }) => (
	<Live input={{}} query={props.api.roleSettings.defaults}>
		{(rows) => (
			<div>
				{rows.map((row) => (
					<CommandForm command={props.api.roleSettings.choose} fixed={FIXED} key={row.id} placeholders={PLACEHOLDERS} row={row} />
				))}
			</div>
		)}
	</Live>
);

const shown = (board: Desk, screen: ReactNode) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(<board.glass.Provider>{screen}</board.glass.Provider>));
		yield* until(() => container.querySelectorAll("form").length > 0);
		return container;
	});

const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	container.querySelector<Element>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

const offered = (container: HTMLElement, label: string): readonly string[] => {
	const named = labelled<HTMLInputElement>(container, label).getAttribute("list") ?? "";
	const list = document.getElementById(named);
	return [...(list?.querySelectorAll("option") ?? [])].map((option) => option.value);
};

const saving = (container: HTMLElement, place: number) =>
	settle(() => [...container.querySelectorAll("form")][place]?.querySelector("button")?.click());

it.live("draws a select of the values the field's schema allows", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <Board api={board.glass.api} />);
		expect([...labelled<HTMLSelectElement>(container, "Flagship Backend").options].map((option) => option.value)).toEqual([
			"",
			"claude",
			"codex",
			"opencode",
			"pi",
		]);
		expect(container.querySelectorAll("form")).toHaveLength(4);
	}),
);

it.live("offers the models of the backend the form is on", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <Board api={board.glass.api} />);
		yield* settle(() => write(labelled<HTMLSelectElement>(container, "Flagship Backend"), "claude"));
		yield* until(() => offered(container, "Flagship Model").length === 1);
		expect(offered(container, "Flagship Model")).toEqual(["opus"]);
		yield* settle(() => write(labelled<HTMLSelectElement>(container, "Flagship Backend"), "codex"));
		yield* until(() => offered(container, "Flagship Model").length === 2);
		expect(offered(container, "Flagship Model")).toEqual(["gpt", "gpt-mini"]);
	}),
);

it.live("keeps a model the catalogue does not list", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <Board api={board.glass.api} />);
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Captain Model"), "gpt-6-astra"));
		yield* saving(container, 1);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ model: "gpt-6-astra", role: "captain", scope: "fleet" });
	}),
);

it.live("sends the row's own fields with the change and settles clean", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <Board api={board.glass.api} />);
		const save = () => [...container.querySelectorAll("form")][0]?.querySelector("button");
		expect(save()?.disabled).toBe(true);
		yield* settle(() => write(labelled<HTMLSelectElement>(container, "Flagship Backend"), "claude"));
		expect(save()?.disabled).toBe(false);
		yield* saving(container, 0);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ backend: "claude", effort: null, model: null, role: "flagship", scope: "fleet" });
		yield* until(() => save()?.disabled === true);
	}),
);

it.live("sends nothing chosen as null", () =>
	Effect.gen(function* () {
		const board = desk();
		yield* SubscriptionRef.set(board.settings, [{ backend: "codex", effort: null, id: "fleet/crew", model: "gpt", role: "crew", scope: "fleet" }]);
		const container = yield* shown(board, <Board api={board.glass.api} />);
		yield* until(() => labelled<HTMLInputElement>(container, "Crew Model").value === "gpt");
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Crew Model"), ""));
		yield* saving(container, 2);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ backend: "codex", model: null, role: "crew" });
	}),
);

const REFUSED = { field: "model", message: "No such model" };

const refusing = Object.assign(() => Effect.fail(REFUSED), { command: choose });

const ROW = { backend: "codex", effort: null, id: "fleet/crew", model: "gpt", role: "crew", scope: "fleet" };

it.live("puts a rejection on the field it names", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <CommandForm command={refusing} fixed={FIXED} row={ROW} />);
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Crew Model"), "gpt-mini"));
		yield* saving(container, 0);
		yield* until(() => labelled<HTMLInputElement>(container, "Crew Model").getAttribute("aria-invalid") === "true");
		expect(container.textContent).toContain(REFUSED.message);
	}),
);

const flagged = fact("Flagged", { role: Schema.String, wanted: Schema.Boolean });

const flag = command("flag", {
	input: { role: Schema.String, wanted: optional(Schema.Boolean, { title: "Wanted" }) },
	reads: [],
	emits: flagged,
	rejections: {},
	run: (input) => Effect.succeed({ role: input.role, wanted: input.wanted === true }),
});

it.live("draws a boolean field as a checkbox", () =>
	Effect.gen(function* () {
		const board = desk();
		const asked: Record<string, unknown>[] = [];
		const flagging = Object.assign((input: Record<string, unknown>) => Effect.succeed(asked.push(input)), { command: flag });
		const container = yield* shown(board, <CommandForm command={flagging} fixed={FIXED} row={{ role: "crew", wanted: false }} />);
		yield* settle(() => labelled<HTMLInputElement>(container, "Crew Wanted").click());
		yield* saving(container, 0);
		yield* until(() => asked.length === 1);
		expect(asked[0]).toMatchObject({ role: "crew", wanted: true });
	}),
);

const counted = fact("Counted", { key: Schema.String, count: Schema.Number });

const setCount = command("setCount", {
	input: { key: Schema.String, count: titled(Schema.Number, { title: "Count" }) },
	reads: [],
	emits: counted,
	rejections: {},
	run: (input) => Effect.succeed({ count: input.count, key: input.key }),
});

const DESCRIPTION = "How many agents may be running at once.";

it.live("draws the sentence the screen gives the row under it", () =>
	Effect.gen(function* () {
		const board = desk();
		const counting = Object.assign((_input: Record<string, unknown>) => Effect.succeed(1), { command: setCount });
		const row = { count: 4, key: "maxParallelSessions" };
		const container = yield* shown(board, <CommandForm command={counting} description={DESCRIPTION} label="Maximum running agents" row={row} />);
		expect(container.textContent).toContain(DESCRIPTION);
	}),
);

it.live("draws a number field as a number input under the words the screen gives the row", () =>
	Effect.gen(function* () {
		const board = desk();
		const asked: Record<string, unknown>[] = [];
		const counting = Object.assign((input: Record<string, unknown>) => Effect.succeed(asked.push(input)), { command: setCount });
		const row = { count: 4, key: "maxParallelSessions" };
		const container = yield* shown(board, <CommandForm command={counting} label="Maximum running agents" row={row} />);
		const field = labelled<HTMLInputElement>(container, "Maximum running agents Count");
		expect(field.type).toBe("number");
		expect(field.value).toBe("4");
		yield* settle(() => write(field, "12"));
		yield* saving(container, 0);
		yield* until(() => asked.length === 1);
		expect(asked[0]).toMatchObject({ count: 12, key: "maxParallelSessions" });
	}),
);

const opened = fact("Opened", { context: Schema.String, kind: Schema.String, name: Schema.String });

const openVoyage = command("open", {
	input: {
		name: titled(Schema.String, { title: "Name" }),
		context: titled(Schema.String, { multiline: true, title: "Context" }),
		kind: titled(Schema.Literals(["voyage", "flagship"]), { title: "Kind" }),
	},
	reads: [],
	emits: opened,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
	run: (input) => Effect.succeed({ context: input.context, kind: input.kind, name: input.name }),
});

const FIXED_KIND = { kind: "voyage" } as const;

const opening = (sent: Record<string, unknown>[], answer: (input: Record<string, unknown>) => Effect.Effect<number, unknown>) =>
	Object.assign(
		(input: Record<string, unknown>) => {
			sent.push(input);
			return answer(input);
		},
		{ command: openVoyage },
	);

it.live("draws a multiline field as a textarea", () =>
	Effect.gen(function* () {
		const board = desk();
		const sent: Record<string, unknown>[] = [];
		const container = yield* shown(board, <CommandForm command={opening(sent, () => Effect.succeed(1))} fixed={FIXED_KIND} submit="Open voyage" />);

		expect(labelled<HTMLElement>(container, "Open voyage Context").tagName).toBe("TEXTAREA");
		expect(labelled<HTMLElement>(container, "Open voyage Name").tagName).toBe("INPUT");
	}),
);

it.live("draws an empty form with its submit button, sends the fixed values undrawn, and clears", () =>
	Effect.gen(function* () {
		const board = desk();
		const sent: Record<string, unknown>[] = [];
		const container = yield* shown(board, <CommandForm command={opening(sent, () => Effect.succeed(1))} fixed={FIXED_KIND} submit="Open voyage" />);
		const button = () => container.querySelector("button");
		expect(labelled<HTMLInputElement>(container, "Open voyage Name").value).toBe("");
		expect(container.querySelector('[aria-label="Open voyage Kind"]')).toBeNull();
		expect(button()?.textContent).toBe("Open voyage");
		expect(button()?.disabled).toBe(false);

		yield* settle(() => write(labelled<HTMLInputElement>(container, "Open voyage Name"), "Chart the reef"));
		yield* settle(() => write(labelled<HTMLTextAreaElement>(container, "Open voyage Context"), "Two lines\nof context"));
		yield* saving(container, 0);
		yield* until(() => sent.length === 1);

		expect(sent[0]).toEqual({ context: "Two lines\nof context", kind: "voyage", name: "Chart the reef" });
		yield* until(() => labelled<HTMLInputElement>(container, "Open voyage Name").value === "");
		expect(labelled<HTMLTextAreaElement>(container, "Open voyage Context").value).toBe("");
	}),
);

it.live("keeps what was typed and names the field a rejection blames", () =>
	Effect.gen(function* () {
		const board = desk();
		const sent: Record<string, unknown>[] = [];
		const refusing = opening(sent, () => Effect.fail(new openVoyage.Rejection.Blank({ field: "name", message: "A voyage needs a name" })));
		const container = yield* shown(board, <CommandForm command={refusing} fixed={FIXED_KIND} submit="Open voyage" />);

		yield* settle(() => write(labelled<HTMLInputElement>(container, "Open voyage Context"), "the reef"));
		yield* saving(container, 0);
		yield* until(() => labelled<HTMLInputElement>(container, "Open voyage Name").getAttribute("aria-invalid") === "true");

		expect(container.textContent).toContain("A voyage needs a name");
		expect(labelled<HTMLTextAreaElement>(container, "Open voyage Context").value).toBe("the reef");
	}),
);
