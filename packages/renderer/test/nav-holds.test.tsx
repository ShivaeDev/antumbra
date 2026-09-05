import type { ConsolePlace, SettingsReading } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { ConsoleApp } from "#app.tsx";

const { announce, loadSettings } = vi.hoisted(() => {
	const told: Array<(settings: SettingsReading) => void> = [];
	return {
		announce: told,
		loadSettings: vi.fn((onSettings: (settings: SettingsReading) => void) => {
			told.push(onSettings);
		}),
	};
});

vi.mock("#adapters/trpc-settings.ts", () => ({ changeSetting: vi.fn(), loadSettings }));
vi.mock("#adapters/trpc-windows.ts", () => ({ rememberPlace: vi.fn() }));
vi.mock("#hooks/feed.ts", () => ({ useFeed: () => ({ error: undefined, value: undefined }) }));
vi.mock("#views/console-main.tsx", () => ({ ConsoleMain: () => null }));

const place = {
	changeId: null,
	mode: "fleet",
	pieceId: null,
	role: "console",
	sessionId: null,
	voyageId: null,
} as const satisfies ConsolePlace;

const reading = (overrides: Partial<SettingsReading["settings"]>): SettingsReading => ({
	overridden: [],
	settings: {
		foldToolCalls: false,
		holdEverything: false,
		holdPieceDispatch: false,
		holdWakes: false,
		idleSiestaMinutes: 60,
		maxParallelSessions: 4,
		retireRestMinutes: 15,
		retireSweep: true,
		routineMailMinutes: 5,
		...overrides,
	},
});

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const navigating = Effect.fnUntraced(function* (settings: SettingsReading) {
	const container = document.createElement("div");
	const root = createRoot(container);
	yield* settle(() => root.render(<ConsoleApp place={place} />));
	yield* settle(() => announce.at(-1)?.(settings));
	yield* Effect.addFinalizer(() => settle(() => root.unmount()));
	return [...container.querySelectorAll("nav button")].find((button) => button.textContent?.startsWith("Holds"));
});

it.effect(
	"leaves the Holds entry unmarked while everything is sending",
	Effect.fnUntraced(function* () {
		expect((yield* navigating(reading({})))?.textContent).toBe("Holds");
	}),
);

it.effect(
	"marks the Holds entry from any other page while a hold stands",
	Effect.fnUntraced(function* () {
		expect((yield* navigating(reading({ holdWakes: true })))?.textContent).toBe("Holdsheld");
	}),
);

it.effect(
	"marks the Holds entry while the master hold stands alone",
	Effect.fnUntraced(function* () {
		expect((yield* navigating(reading({ holdEverything: true })))?.textContent).toBe("Holdsheld");
	}),
);
