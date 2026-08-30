// why: @vitest-environment happy-dom proves the selected Change crosses the
// same remembered window-place boundary as voyage and Session selections.

import type { ConsolePlace } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { ConsoleApp } from "#app.tsx";

const { rememberPlace } = vi.hoisted(() => ({ rememberPlace: vi.fn() }));

vi.mock("#adapters/trpc-windows.ts", () => ({ rememberPlace }));
vi.mock("#adapters/trpc.ts", () => ({
	retryBackend: vi.fn(),
	watchFleet: vi.fn(),
}));
vi.mock("#adapters/trpc-voyages.ts", () => ({ watchVoyages: vi.fn() }));
vi.mock("#hooks/feed.ts", () => {
	const capacityFleetFeed = () => ({
		agents: [],
		backends: [],
		capacities: [
			{
				backend: "claude",
				detail: "Hourly limit nearly reached",
				reason: "rate-limit",
				resetsAt: null,
				status: "warning",
				utilization: 0.91,
			},
		],
		diag: { intents: [] },
		repos: [],
	});

	return {
		useFeed: (key: string) => ({
			error: undefined,
			value: key === "fleet" ? capacityFleetFeed() : [],
		}),
	};
});
vi.mock("#session-drafts/store.ts", () => ({
	discardMissingSessionDrafts: vi.fn(),
}));
vi.mock("#views/nav-rail.tsx", () => ({ NavRail: () => null }));
vi.mock("#views/notice-bar.tsx", () => ({ NoticeBar: () => null }));
vi.mock("#views/console-main.tsx", () => ({
	ConsoleMain: ({
		change,
		onChange,
	}: {
		readonly change: string | undefined;
		readonly onChange: (changeId: string | undefined) => void;
	}) => (
		<button onClick={() => onChange("change-8")} type="button">
			{change}
		</button>
	),
}));

const place = {
	changeId: "change-7",
	mode: "quay",
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
		yield* settle(() => container.querySelector("button")?.click());
		expect(rememberPlace).toHaveBeenLastCalledWith(
			{ ...place, changeId: "change-8" },
			expect.any(Function),
		);
		yield* settle(() => root.unmount());
	}),
);

it.effect("shows provider capacity above the active console workspace", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* settle(() => root.render(<ConsoleApp place={place} />));

		const capacity = container.textContent.indexOf("Provider limit warning");
		const workspace = container.textContent.indexOf("change-7");
		expect(capacity).toBeGreaterThanOrEqual(0);
		expect(capacity).toBeLessThan(workspace);
		yield* settle(() => root.unmount());
	}),
);
