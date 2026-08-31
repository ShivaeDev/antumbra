// @vitest-environment happy-dom

import type { ConsolePlace } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { ConsoleApp } from "#app.tsx";

const { rememberPlace } = vi.hoisted(() => ({ rememberPlace: vi.fn() }));

vi.mock("#adapters/trpc-windows.ts", () => ({ rememberPlace }));
vi.mock("#adapters/trpc-settings.ts", () => ({ loadSettings: vi.fn() }));
vi.mock("#hooks/feed.ts", () => ({
	useFeed: () => ({ error: undefined, value: undefined }),
}));
vi.mock("#views/quay.tsx", () => ({
	QuayPanel: ({ onSelect, selectedId }: { readonly onSelect: (changeId: string | undefined) => void; readonly selectedId: string | undefined }) => (
		<button onClick={() => onSelect("change-8")} type="button">
			{selectedId}
		</button>
	),
}));

const place = {
	changeId: "change-7",
	mode: "quay",
	pieceId: null,
	role: "console",
	sessionId: null,
	voyageId: null,
} as const satisfies ConsolePlace;

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

it.effect("restores and remembers the selected pull request", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* settle(() => root.render(<ConsoleApp place={place} />));

		expect(container.textContent).toContain("change-7");
		yield* settle(() => container.querySelector<HTMLButtonElement>("main button")?.click());
		expect(rememberPlace).toHaveBeenLastCalledWith({ ...place, changeId: "change-8" }, expect.any(Function));
		yield* settle(() => root.unmount());
	}),
);
