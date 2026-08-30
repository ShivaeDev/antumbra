// why: @vitest-environment happy-dom proves a page sending the reader to a
// piece changes the mode and the selection as one remembered place.

import type { ConsolePlace } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { ConsoleApp } from "#app.tsx";
import type { Navigate } from "#console/navigation.ts";

const { rememberPlace } = vi.hoisted(() => ({ rememberPlace: vi.fn() }));

vi.mock("#adapters/trpc-windows.ts", () => ({ rememberPlace }));
vi.mock("#adapters/trpc.ts", () => ({ watchFleet: vi.fn() }));
vi.mock("#adapters/trpc-voyages.ts", () => ({ watchVoyages: vi.fn() }));
vi.mock("#hooks/feed.ts", () => ({
	useFeed: (key: string) => ({
		error: undefined,
		value:
			key === "fleet"
				? { agents: [], backends: [], diag: { intents: [] }, repos: [] }
				: [],
	}),
}));
vi.mock("#session-drafts/store.ts", () => ({
	discardMissingSessionDrafts: vi.fn(),
}));
vi.mock("#views/nav-rail.tsx", () => ({ NavRail: () => null }));
vi.mock("#views/notice-bar.tsx", () => ({ NoticeBar: () => null }));
vi.mock("#views/console-main.tsx", () => ({
	ConsoleMain: ({
		mode,
		onNavigate,
		piece,
	}: {
		readonly mode: string;
		readonly onNavigate: Navigate;
		readonly piece: string | undefined;
	}) => (
		<button
			onClick={() =>
				onNavigate({
					mode: "voyages",
					pieceId: "piece-1",
					voyageId: "voyage-1",
				})
			}
			type="button"
		>
			{mode} {piece}
		</button>
	),
}));

const place = {
	changeId: null,
	mode: "fleet",
	pieceId: null,
	role: "console",
	sessionId: "session-1",
	voyageId: null,
} as const satisfies ConsolePlace;

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

it.effect("moves to the piece in one remembered place", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* settle(() => root.render(<ConsoleApp place={place} />));

		expect(rememberPlace).toHaveBeenLastCalledWith(place, expect.any(Function));
		yield* settle(() => container.querySelector("button")?.click());
		expect(container.textContent).toBe("voyages piece-1");
		expect(rememberPlace).toHaveBeenLastCalledWith(
			{ ...place, mode: "voyages", pieceId: "piece-1", voyageId: "voyage-1" },
			expect.any(Function),
		);
		yield* settle(() => root.unmount());
	}),
);
