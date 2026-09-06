import type { BoardEntryView, SummaryLevel } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { mount, settle } from "#test/dom.ts";
import { BoardPanel } from "#views/board.tsx";

const at = (day: number): string => `2026-08-${String(day).padStart(2, "0")}T09:10:00.000Z`;

const rough = (seq: number, day: number, body: string): BoardEntryView => ({
	authorAgentId: "agent-1",
	body,
	createdAt: at(day),
	id: `rough-${seq}`,
	kind: "note",
	register: "rough",
	seq,
});

const summary = (seq: number, day: number, level: SummaryLevel, coversFrom: number, coversTo: number, body: string): BoardEntryView => ({
	authorAgentId: "agent-9",
	body,
	coversFrom,
	coversTo,
	createdAt: at(day),
	id: `summary-${seq}`,
	kind: "summary",
	level,
	register: "smooth",
	seq,
});

const oneDay: ReadonlyArray<BoardEntryView> = [
	rough(1, 14, "first sounding"),
	rough(2, 14, "second sounding"),
	summary(3, 15, "day", 1, 2, "# Soundings\n\nMark the **shallow** water."),
	rough(4, 15, "a fresh sounding"),
];

const deep: ReadonlyArray<BoardEntryView> = [
	rough(1, 14, "first sounding"),
	rough(2, 14, "second sounding"),
	summary(3, 15, "day", 1, 2, "the shallow edge"),
	summary(4, 16, "day", 1, 3, "the week so far"),
	summary(5, 17, "day", 1, 4, "the month so far"),
	summary(6, 18, "piece", 1, 5, "the whole piece"),
];

const panel = (entries: ReadonlyArray<BoardEntryView>, piece = false) => (
	<BoardPanel
		entries={entries}
		name={piece ? "soundings" : "Chart the reef"}
		scope={piece ? { kind: "piece", pieceId: "piece-1" } : { kind: "voyage", voyageId: "voyage-1" }}
	/>
);

const clickHeading = (container: HTMLElement): Effect.Effect<void> => settle(() => container.querySelector("button")?.click());

const disclosures = (container: HTMLElement): ReadonlyArray<HTMLButtonElement> => [
	...container.querySelectorAll<HTMLButtonElement>("button[aria-expanded]"),
];

const openDeepest = (container: HTMLElement): Effect.Effect<void> => settle(() => disclosures(container).at(-1)?.click());

const log = (container: HTMLElement): string => container.querySelector("ul")?.textContent ?? "";

const shown = (entries: ReadonlyArray<BoardEntryView>, piece = false) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(panel(entries, piece)));
		yield* clickHeading(container);
		return container;
	});

it.effect("keeps a log collapsed until asked, then reads its entries as Markdown", () =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(panel(oneDay)));

		expect(container.innerHTML).toContain('aria-expanded="false"');
		expect(container.innerHTML).not.toContain("<h1>");
		expect(container.textContent).not.toContain("Write to the board");

		yield* clickHeading(container);

		expect(container.innerHTML).toContain('aria-expanded="true"');
		expect(container.innerHTML).toContain("<h1>Soundings</h1>");
		expect(container.innerHTML).toContain("<strong>shallow</strong>");
		expect(container.textContent).toContain("Write to the board");

		yield* clickHeading(container);
		expect(container.innerHTML).not.toContain("<h1>");
	}),
);

it.effect("reads the log newest first, with the tail above the summary that stands for the rest", () =>
	Effect.gen(function* () {
		const container = yield* shown(oneDay);

		expect(container.textContent).toContain("Entries newest first; open a summary to see the entries behind it.");
		expect(log(container)).toMatch(/a fresh sounding[\s\S]*Day summary · 2026-08-14/);
	}),
);

it.effect("names the smoother and drops the register from every entry", () =>
	Effect.gen(function* () {
		const container = yield* shown(oneDay);

		expect(log(container)).toContain("Smoother");
		expect(log(container)).not.toContain("Rough log");
		expect(log(container)).not.toContain("Smooth log");
	}),
);

it.effect("holds the entries behind a summary until the count is opened", () =>
	Effect.gen(function* () {
		const container = yield* shown(oneDay);
		expect(container.textContent).toContain("2 entries");
		expect(log(container)).not.toContain("first sounding");

		yield* openDeepest(container);

		expect(log(container)).toContain("first sounding");
		expect(log(container)).toMatch(/second sounding[\s\S]*first sounding/);
	}),
);

it.effect("stops at the third level down and shows the last count without a way in", () =>
	Effect.gen(function* () {
		const container = yield* shown(deep, true);
		expect(log(container)).toContain("Piece summary · soundings");
		expect(log(container)).toContain("1 day · 2 entries");

		yield* openDeepest(container);
		yield* openDeepest(container);
		yield* openDeepest(container);

		expect(disclosures(container)).toHaveLength(4);
		expect([...container.querySelectorAll("p")].filter((line) => line.textContent === "2 entries")).toHaveLength(1);
		expect(log(container)).not.toContain("first sounding");
	}),
);

it.effect("stands an admiral's own smooth entry as a block with nothing behind it", () =>
	Effect.gen(function* () {
		const container = yield* shown([
			{ authorAgentId: null, body: "the reef shifts after a storm", createdAt: at(14), id: "note-1", kind: "note", register: "smooth", seq: 1 },
		]);

		expect(log(container)).toContain("Note");
		expect(log(container)).toContain("the reef shifts after a storm");
		expect(disclosures(container)).toHaveLength(1);
	}),
);

it.effect("says what would be here when the board is empty", () =>
	Effect.gen(function* () {
		const container = yield* shown([]);

		expect(container.textContent).toContain("No entries yet; agents write here as they work");
		expect(container.textContent).not.toContain("Entries newest first");
	}),
);

it.effect("says that a voyage board is smoothed by the day or on the admiral's word", () =>
	Effect.gen(function* () {
		const container = yield* shown([rough(1, 14, "first sounding")]);

		expect(container.textContent).toContain("No summary yet; one is written at the end of each day or when you smooth now");
	}),
);

it.effect("says that a piece board is smoothed when the Piece completes", () =>
	Effect.gen(function* () {
		const container = yield* shown([rough(1, 14, "first sounding")], true);

		expect(container.textContent).toContain("No summary yet; one is written when the Piece completes");
	}),
);

it.effect("drops the line about the first summary once one is written", () =>
	Effect.gen(function* () {
		const container = yield* shown(oneDay);

		expect(container.textContent).not.toContain("No summary yet");
	}),
);
