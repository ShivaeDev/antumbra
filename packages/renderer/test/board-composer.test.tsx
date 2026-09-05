import type { BoardWriteRequest } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { BoardComposer } from "#views/board-composer.tsx";

const { writeBoard } = vi.hoisted(() => ({ writeBoard: vi.fn() }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ writeBoard }));
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
		yield* settle(() => root.render(<BoardComposer scope={{ kind: "piece", pieceId: "piece" }} />));
	});
const write = (body: string) => {
	const textarea = document.querySelector("textarea");
	if (textarea === null) return Effect.runSync(Effect.die("Missing board draft"));
	Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(textarea, body);
	textarea.dispatchEvent(new Event("input", { bubbles: true }));
};

it.effect("keeps raw board text after failure and clears only the body after a successful retry", () =>
	Effect.gen(function* () {
		const first = yield* Deferred.make<void, RendererRequestError>();
		const second = yield* Deferred.make<void>();
		const started = yield* Deferred.make<BoardWriteRequest>();
		const retried = yield* Deferred.make<void>();
		writeBoard.mockImplementationOnce((value: BoardWriteRequest) => Deferred.succeed(started, value).pipe(Effect.andThen(Deferred.await(first))));
		writeBoard.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		yield* mount();
		expect(button("Write")?.disabled).toBe(true);
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(writeBoard).not.toHaveBeenCalled();
		yield* settle(() => {
			write("  **soundings**\n\nLeave the spacing.  ");
			button("Rough log")?.click();
		});
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(yield* Deferred.await(started)).toEqual({
			body: "  **soundings**\n\nLeave the spacing.  ",
			register: "rough",
			scope: { kind: "piece", pieceId: "piece" },
		});
		expect(document.querySelector("textarea")?.closest("fieldset")?.disabled).toBe(true);
		expect(button("Writing…")?.disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "Board unavailable" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("Board unavailable");
		expect(document.querySelector("textarea")?.value).toBe("  **soundings**\n\nLeave the spacing.  ");
		expect(button("Rough log")?.getAttribute("aria-pressed")).toBe("true");
		yield* settle(() => button("Write")?.click());
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, undefined));
		});
		expect(document.querySelector("textarea")?.value).toBe("");
		expect(button("Rough log")?.getAttribute("aria-pressed")).toBe("true");
		expect(button("Write")?.disabled).toBe(true);
		expect(document.querySelector('[role="alert"]')).toBeNull();
	}),
);
