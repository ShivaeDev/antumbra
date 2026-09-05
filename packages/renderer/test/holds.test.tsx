import type { HoldsView, SettingsReading } from "@antumbra/contract";
import { holds } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, vi } from "vitest";
import { holdWords, mailWords, waitedWords } from "#views/hold-words.ts";
import { HoldsPanel } from "#views/holds.tsx";
import { ModeNav } from "#views/mode-nav.tsx";

interface Opened {
	readonly onHolds: (holds: HoldsView) => void;
}

const { changeSetting, opened, watchHolds } = vi.hoisted(() => {
	const held: Array<Opened> = [];
	return {
		changeSetting: vi.fn(),
		opened: held,
		watchHolds: vi.fn((onHolds: Opened["onHolds"]) => {
			held.push({ onHolds });
			return vi.fn();
		}),
	};
});

vi.mock("#adapters/trpc-holds.ts", () => ({ watchHolds }));
vi.mock("#adapters/trpc-settings.ts", () => ({ changeSetting, loadSettings: vi.fn() }));

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
		routineMailMinutes: 5,
		retireSweep: true,
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

const mount = () => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const showing = (mounted: ReturnType<typeof mount>, settings: SettingsReading): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<HoldsPanel onError={() => undefined} onSettings={() => undefined} settings={settings} />));
		yield* settle(() => opened.at(-1)?.onHolds(holds));
	});

const switchNamed = (mounted: ReturnType<typeof mount>, label: string) =>
	[...mounted.container.querySelectorAll("input")].find((input) => input.getAttribute("aria-label") === label);

const heldMarks = (mounted: ReturnType<typeof mount>) =>
	[...mounted.container.querySelectorAll("li span")].filter((span) => span.textContent === "held");

beforeEach(() => {
	opened.length = 0;
	changeSetting.mockClear();
	watchHolds.mockClear();
});

it("offers Holds in the established console navigation", () => {
	expect(renderToStaticMarkup(<ModeNav held={false} mode="fleet" onMode={() => undefined} />)).toContain("Holds");
});

it.effect(
	"lists every queue with its switch sending and no held mark",
	Effect.fnUntraced(function* () {
		const mounted = mount();
		yield* Effect.addFinalizer(() => settle(() => mounted.root.unmount()));
		yield* showing(mounted, reading({}));

		expect(mounted.container.textContent).toContain("Sound the shallows");
		expect(mounted.container.textContent).toContain("Chart the reef");
		expect(mounted.container.textContent).toContain("quartermaster");
		expect(switchNamed(mounted, "All queues")?.checked).toBe(true);
		expect(switchNamed(mounted, "Piece dispatch")?.checked).toBe(true);
		expect(switchNamed(mounted, "Wakes")?.checked).toBe(true);
		expect(heldMarks(mounted)).toHaveLength(0);
	}),
);

it.effect(
	"marks everything held while the master switch is off and still lists it",
	Effect.fnUntraced(function* () {
		const mounted = mount();
		yield* Effect.addFinalizer(() => settle(() => mounted.root.unmount()));
		yield* showing(mounted, reading({ holdEverything: true }));

		expect(switchNamed(mounted, "All queues")?.checked).toBe(false);
		expect(switchNamed(mounted, "Piece dispatch")?.checked).toBe(true);
		expect(mounted.container.textContent).toContain("Mark the channel");
		expect(mounted.container.textContent).toContain("everything held");
		expect(heldMarks(mounted)).toHaveLength(3);
	}),
);

it.effect(
	"marks only its own queue held when one kind is switched off",
	Effect.fnUntraced(function* () {
		const mounted = mount();
		yield* Effect.addFinalizer(() => settle(() => mounted.root.unmount()));
		yield* showing(mounted, reading({ holdWakes: true }));

		expect(switchNamed(mounted, "Wakes")?.checked).toBe(false);
		expect(heldMarks(mounted)).toHaveLength(1);
	}),
);

it.effect(
	"asks for the hold the moment a switch is flipped off",
	Effect.fnUntraced(function* () {
		const mounted = mount();
		yield* Effect.addFinalizer(() => settle(() => mounted.root.unmount()));
		yield* showing(mounted, reading({}));
		yield* settle(() => switchNamed(mounted, "Piece dispatch")?.click());

		expect(changeSetting.mock.calls[0]?.[0]).toEqual({ key: "holdPieceDispatch", value: true });
	}),
);

it("says how a queue reads under its own switch and under the master", () => {
	expect(holdWords(false, false)).toBe("sending");
	expect(holdWords(false, true)).toBe("held");
	expect(holdWords(true, false)).toBe("everything held");
});

it("says how long a thing has waited and what a wake waits for", () => {
	expect(waitedWords(30_000)).toBe("waiting under a minute");
	expect(waitedWords(4 * 60_000)).toBe("waiting 4m");
	expect(waitedWords(90 * 60_000)).toBe("waiting 1h");
	expect(mailWords({ count: 1, precedence: "flash" })).toBe("1 mail · flash");
	expect(mailWords({ count: 3, precedence: "priority" })).toBe("3 mail · priority");
	expect(mailWords({ count: 2, precedence: "routine" })).toBe("2 mail");
});
