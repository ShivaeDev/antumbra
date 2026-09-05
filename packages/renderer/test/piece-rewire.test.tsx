import { soundings } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { PieceActs } from "#views/piece-acts.tsx";

const harbor = { ...soundings, id: "harbor", title: "Harbor" };
const chart = { ...soundings, id: "chart", title: "Chart", dependsOn: [soundings.id] };

const { rewirePiece } = vi.hoisted(() => ({ rewirePiece: vi.fn() }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ rewirePiece }));
const settle = (change: () => void) =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);
const button = (text: string) => [...document.querySelectorAll("button")].find((entry) => entry.textContent === text);
const mount = () =>
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
		yield* mount();
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
		const root = yield* mount();
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
