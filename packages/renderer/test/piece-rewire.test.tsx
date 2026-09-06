import { soundings } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { mount, settle } from "#test/dom.ts";
import { PieceActs } from "#views/piece-acts.tsx";

const harbor = { ...soundings, id: "harbor", title: "Harbor" };
const chart = { ...soundings, id: "chart", title: "Chart", dependsOn: [soundings.id] };

const { rewirePiece } = vi.hoisted(() => ({ rewirePiece: vi.fn() }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ rewirePiece }));
const button = (text: string) => [...document.querySelectorAll("button")].find((entry) => entry.textContent === text);
const shown = () =>
	Effect.gen(function* () {
		const { root } = yield* mount();
		yield* settle(() => root.render(<PieceActs piece={chart} pieces={[soundings, chart, harbor]} onError={() => undefined} />));
		return root;
	});

it.effect("retains the dependency draft while saving and after failure, then closes on success", () =>
	Effect.gen(function* () {
		const first = yield* Deferred.make<void, RendererRequestError>();
		const second = yield* Deferred.make<void>();
		const started = yield* Deferred.make<void>();
		const retried = yield* Deferred.make<void>();
		rewirePiece.mockReturnValueOnce(Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(first))));
		rewirePiece.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		yield* shown();
		yield* settle(() => button("Rewire")?.click());
		const select = document.querySelector("select");
		expect([...(select?.options ?? [])].map((option) => option.value)).toEqual([soundings.id, harbor.id]);
		yield* settle(() => {
			for (const option of select?.options ?? []) option.selected = false;
			select?.dispatchEvent(new Event("change", { bubbles: true }));
		});
		yield* settle(() => button("Save position")?.click());
		expect(document.querySelector("select")).not.toBeNull();
		yield* Deferred.await(started);
		expect(select?.closest("fieldset")?.disabled).toBe(true);
		expect(rewirePiece).toHaveBeenCalledWith({ dependsOn: [], pieceId: chart.id });
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Position unavailable" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("Position unavailable");
		expect([...(select?.selectedOptions ?? [])]).toEqual([]);
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, undefined));
		});
		expect(document.querySelector("select")).toBeNull();
	}),
);

it.effect("opens from the current saved dependencies after an edit is dismissed", () =>
	Effect.gen(function* () {
		const root = yield* shown();
		yield* settle(() => button("Rewire")?.click());
		const select = document.querySelector("select");
		expect(select?.labels?.item(0)?.textContent).toBe("Depends on");
		yield* settle(() => {
			for (const option of select?.options ?? []) option.selected = option.value === harbor.id;
			select?.dispatchEvent(new Event("change", { bubbles: true }));
		});
		yield* settle(() => button("Rewire")?.click());
		expect(document.querySelector("select")).toBeNull();
		yield* settle(() => root.render(<PieceActs piece={{ ...chart, dependsOn: [] }} pieces={[soundings, chart, harbor]} onError={() => undefined} />));
		yield* settle(() => button("Rewire")?.click());
		expect([...(document.querySelector("select")?.options ?? [])].filter((option) => option.selected)).toEqual([]);
	}),
);
