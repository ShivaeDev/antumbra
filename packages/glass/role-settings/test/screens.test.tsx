import { expect, it } from "@effect/vitest";
import { Effect, SubscriptionRef } from "effect";
import type { ReactNode } from "react";
import { RoleDefaults } from "#defaults.tsx";
import { type Desk, desk } from "#test/desk.ts";
import { mount, settle, until, write } from "#test/dom.ts";
import { VoyageRoleSettings } from "#voyage.tsx";

const VOYAGE = "voyage-1";

const shown = (board: Desk, screen: ReactNode) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(<board.glass.Provider>{screen}</board.glass.Provider>));
		yield* until(() => container.querySelectorAll("form").length > 0);
		return container;
	});

const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	container.querySelector<Element>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

const named = (form: HTMLFormElement): string | null | undefined => document.getElementById(form.getAttribute("aria-labelledby") ?? "")?.textContent;

const saving = (container: HTMLElement, place: number) =>
	settle(() => [...container.querySelectorAll("form")][place]?.querySelector("button")?.click());

it.live("gives every fleet role its own form", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <RoleDefaults api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 4);
		expect([...container.querySelectorAll("form")].map(named)).toEqual(["Flagship", "Captain", "Crew", "Smoother"]);
	}),
);

it.live("sends one choose at the fleet's scope for the role that moved", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <RoleDefaults api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 4);
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Flagship Model"), "opus"));
		yield* saving(container, 0);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ backend: null, effort: null, model: "opus", role: "flagship", scope: "fleet" });
	}),
);

it.live("sends the voyage's scope and shows the fleet's choice as the placeholder", () =>
	Effect.gen(function* () {
		const board = desk();
		yield* SubscriptionRef.set(board.settings, [
			{ backend: "codex", effort: null, id: "fleet/captain", model: "gpt", role: "captain", scope: "fleet" },
		]);
		const container = yield* shown(board, <VoyageRoleSettings api={board.glass.api} voyageId={VOYAGE} />);
		yield* until(() => container.querySelectorAll("form").length === 2);
		expect(labelled<HTMLInputElement>(container, "Captain Model").placeholder).toBe("gpt");
		expect([...labelled<HTMLSelectElement>(container, "Captain Backend").options].map((option) => option.text)).toContain("Fleet default (codex)");
		yield* settle(() => write(labelled<HTMLSelectElement>(container, "Crew Backend"), "claude"));
		yield* saving(container, 1);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ backend: "claude", effort: null, model: null, role: "crew", scope: VOYAGE });
	}),
);
