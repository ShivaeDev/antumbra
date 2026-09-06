import type { ModelChoice, RoleSettings } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { mount, settle, write } from "#test/dom.ts";
import { OpenVoyageForm } from "#views/open-voyage-form.tsx";

const { backendModels, openVoyage } = vi.hoisted(() => ({ backendModels: vi.fn(), openVoyage: vi.fn() }));
vi.mock("#adapters/trpc.ts", () => ({ backendModels }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ openVoyage }));

const listed: Record<string, ReadonlyArray<ModelChoice>> = {
	claude: [
		{ efforts: ["low", "medium"], id: "sonnet", isDefault: true, name: "Sonnet" },
		{ efforts: ["high", "max"], id: "opus", isDefault: false, name: "Opus" },
	],
	codex: [{ efforts: ["high"], id: "gpt-5-codex", isDefault: true, name: "GPT-5 Codex" }],
};

beforeEach(() => {
	openVoyage.mockReset();
	openVoyage.mockReturnValue(Effect.succeed({ id: "voyage" }));
	backendModels.mockReset();
	backendModels.mockImplementation((backend: string, onModels: (choices: ReadonlyArray<ModelChoice>) => void) => {
		onModels(listed[backend] ?? []);
	});
});

const named = (name: string): HTMLInputElement => {
	const input = document.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);
	if (input === null) return Effect.runSync(Effect.die(`Missing field ${name}`));
	return input;
};

const labelled = (label: string): HTMLInputElement => {
	const forId = [...document.querySelectorAll("label")].find((node) => node.textContent === label)?.getAttribute("for");
	const input = document.querySelector<HTMLInputElement>(`input[id="${forId}"]`);
	if (input === null) return Effect.runSync(Effect.die(`Missing field ${label}`));
	return input;
};

const suggested = (name: string): ReadonlyArray<string> => {
	const list = named(name)?.getAttribute("list");
	return [...(document.getElementById(list ?? "")?.querySelectorAll("option") ?? [])].map((option) => option.value);
};

const buttonSaying = (words: string): HTMLButtonElement | undefined =>
	[...(document.querySelector('[data-slot="dialog-content"]') ?? document.body).querySelectorAll("button")].find(
		(entry) => entry.textContent === words,
	);

const keyed = (target: Element | null | undefined, key: string) => {
	target?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
};

const choose = (name: string, backend: string) =>
	Effect.gen(function* () {
		yield* settle(() => keyed(document.querySelector(`[aria-label="${name}"]`), "ArrowDown"));
		yield* settle(() =>
			keyed(
				[...document.querySelectorAll('[role="option"]')].find((option) => option.textContent === backend),
				"Enter",
			),
		);
	});

const shown = (backends: ReadonlyArray<string>, defaults: ReadonlyArray<RoleSettings> = [], onOpened: (id: string) => void = () => undefined) =>
	Effect.gen(function* () {
		const { root } = yield* mount();
		yield* settle(() => root.render(<OpenVoyageForm backends={backends} defaults={defaults} onOpened={onOpened} />));
		yield* settle(() => buttonSaying("Open voyage")?.click());
		yield* settle(() => {
			write(labelled("Name"), "Reef survey");
			write(labelled("North star"), "The reef is charted");
		});
		return root;
	});

it.effect(
	"opens the voyage on the backend, model and effort each role was given",
	Effect.fnUntraced(function* () {
		yield* shown(["claude", "codex"]);

		yield* choose("Crew backend", "codex");
		yield* settle(() => write(named("Captain model"), "opus"));
		yield* settle(() => write(named("Captain effort"), "max"));

		expect(suggested("Crew model")).toEqual(["gpt-5-codex"]);
		expect(suggested("Captain effort")).toEqual(["high", "max"]);

		yield* settle(() => buttonSaying("Open voyage")?.click());

		expect(openVoyage.mock.calls.at(0)?.at(0)).toEqual({
			captainEffort: "max",
			captainModel: "opus",
			context: "",
			crewBackend: "codex",
			name: "Reef survey",
			northStar: "The reef is charted",
		});
	}),
);

it.effect(
	"asks for nothing a role was not given, so the voyage sails as the fleet says",
	Effect.fnUntraced(function* () {
		yield* shown(["claude", "codex"]);

		yield* settle(() => buttonSaying("Open voyage")?.click());

		expect(openVoyage.mock.calls.at(0)?.at(0)).toEqual({
			context: "",
			name: "Reef survey",
			northStar: "The reef is charted",
		});
	}),
);

it.effect(
	"shows the fleet's default for a role the admiral leaves alone",
	Effect.fnUntraced(function* () {
		yield* shown(["claude", "codex"], [{ backend: "codex", effort: "high", model: "gpt-5-codex", role: "captain" }]);

		expect(document.querySelector('[aria-label="Captain backend"]')?.textContent).toContain("codex");
		expect(named("Captain model")?.placeholder).toBe("gpt-5-codex");
		expect(named("Captain effort")?.placeholder).toBe("high");
		expect(named("Crew model")?.placeholder).toBe("the backend's own");
	}),
);

it.effect(
	"drops the fleet's model and effort once a role sails on another backend",
	Effect.fnUntraced(function* () {
		yield* shown(["claude", "codex"], [{ backend: "codex", effort: "high", model: "gpt-5-codex", role: "captain" }]);

		yield* choose("Captain backend", "claude");

		expect(named("Captain model")?.placeholder).toBe("the backend's own");
		expect(named("Captain effort")?.placeholder).toBe("the backend's own");
		expect(suggested("Captain model")).toEqual(["sonnet", "opus"]);
	}),
);

it.effect("keeps both role drafts after failure and closes only when opening succeeds", () =>
	Effect.gen(function* () {
		const first = yield* Deferred.make<{ readonly id: string }, RendererRequestError>();
		const second = yield* Deferred.make<{ readonly id: string }>();
		const started = yield* Deferred.make<void>();
		const retried = yield* Deferred.make<void>();
		openVoyage.mockReturnValueOnce(Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(first))));
		openVoyage.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		const opened: Array<string> = [];
		yield* shown(["claude", "codex"], [], (id) => opened.push(id));
		yield* choose("Crew backend", "codex");
		yield* settle(() => write(named("Captain model"), "unlisted-model"));
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		yield* Deferred.await(started);
		expect(buttonSaying("Opening…")?.disabled).toBe(true);
		expect(named("Captain model")?.closest("fieldset")?.disabled).toBe(true);
		expect(opened).toEqual([]);
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Repository unavailable" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("Repository unavailable");
		expect(named("Captain model")?.value).toBe("unlisted-model");
		expect(document.querySelector('[aria-label="Crew backend"]')?.textContent).toContain("codex");
		yield* settle(() => buttonSaying("Open voyage")?.click());
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, { id: "opened-voyage" }));
		});
		expect(opened).toEqual(["opened-voyage"]);
		expect(document.querySelector("form")).toBeNull();
		yield* settle(() => buttonSaying("Open voyage")?.click());
		expect(labelled("Name")?.value).toBe("");
		expect(labelled("North star")?.value).toBe("");
	}),
);

it.effect("waits for a backend before opening and keeps explicit model text when catalogs arrive", () =>
	Effect.gen(function* () {
		const responses: Array<(models: ReadonlyArray<ModelChoice>) => void> = [];
		backendModels.mockImplementation((_backend: string, onModels: (models: ReadonlyArray<ModelChoice>) => void) => responses.push(onModels));
		const root = yield* shown([]);
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(openVoyage).not.toHaveBeenCalled();
		yield* settle(() => root.render(<OpenVoyageForm backends={["claude"]} defaults={[]} onOpened={() => undefined} />));
		yield* settle(() => write(named("Captain model"), "my-model"));
		yield* settle(() => {
			for (const respond of responses) respond(listed.claude ?? []);
		});
		expect(named("Captain model")?.value).toBe("my-model");
		expect(named("Crew model")?.value).toBe("");
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(openVoyage.mock.calls.at(-1)?.at(0)).toMatchObject({ captainModel: "my-model" });
	}),
);
