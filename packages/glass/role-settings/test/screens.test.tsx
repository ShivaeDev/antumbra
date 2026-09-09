import { expect, it } from "@effect/vitest";
import { Effect, SubscriptionRef } from "effect";
import { RoleDefaults } from "#defaults.tsx";
import type { BackendModels } from "#shape.ts";
import { type Desk, desk } from "#test/desk.ts";
import { mount, settle, until, write } from "#test/dom.ts";
import { VoyageRoleSettings } from "#voyage.tsx";

const VOYAGE = "voyage-1";

const backends: readonly BackendModels[] = [
	{ failure: null, models: [{ efforts: ["low", "high"], id: "opus", isDefault: true, name: "Opus" }], tag: "claude" },
	{ failure: null, models: [{ efforts: ["medium"], id: "gpt", isDefault: true, name: "GPT" }], tag: "codex" },
];

const shown = (board: Desk, screen: React.ReactNode) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(<board.glass.Provider>{screen}</board.glass.Provider>));
		return container;
	});

const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	container.querySelector<Element>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

const saving = (container: HTMLElement) =>
	settle(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "Save")?.click());

it.live("names every fleet role and offers each backend", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <RoleDefaults api={board.glass.api} backends={backends} />);
		yield* until(() => container.querySelectorAll("select").length === 4);
		expect([...container.querySelectorAll("span.text-xs")].map((span) => span.textContent)).toEqual(["Flagship", "Captain", "Crew", "Smoother"]);
		expect([...labelled<HTMLSelectElement>(container, "Crew backend").options].map((option) => option.value)).toEqual(["", "claude", "codex"]);
	}),
);

it.live("sends one choose at the fleet's scope for the role that moved", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <RoleDefaults api={board.glass.api} backends={backends} />);
		yield* until(() => container.querySelectorAll("select").length === 4);
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Flagship model"), "opus"));
		yield* saving(container);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ backend: null, effort: null, model: "opus", role: "flagship", scope: "fleet" });
	}),
);

it.live("sends the voyage's scope and shows the fleet's default as the placeholder", () =>
	Effect.gen(function* () {
		const board = desk();
		yield* SubscriptionRef.set(board.settings, [
			{ backend: "codex", effort: null, id: "fleet/captain", model: "gpt", role: "captain", scope: "fleet" },
		]);
		const container = yield* shown(board, <VoyageRoleSettings api={board.glass.api} backends={backends} voyageId={VOYAGE} />);
		yield* until(() => container.querySelectorAll("select").length === 2);
		expect(labelled<HTMLInputElement>(container, "Captain model").placeholder).toBe("gpt");
		yield* settle(() => write(labelled<HTMLSelectElement>(container, "Crew backend"), "claude"));
		yield* saving(container);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ backend: "claude", effort: null, model: null, role: "crew", scope: VOYAGE });
	}),
);
