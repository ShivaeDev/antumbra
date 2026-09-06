import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import type { BoardEntryRow } from "#model.ts";
import { digestOf, entriesUnder, uncoveredDays, uncoveredSpan } from "#summaries.ts";

const at = (day: number, hour: number) => new Date(2026, 8, day, hour, 0, 0);

const rough = (seq: number, day: number, hour: number): BoardEntryRow => ({
	authorAgentId: "agent-1",
	body: `sounding ${seq}`,
	coversFrom: null,
	coversTo: null,
	createdAt: at(day, hour),
	id: `rough-${seq}`,
	kind: "note",
	level: null,
	precedence: "routine",
	register: "rough",
	seq,
	sourceRef: null,
});

const summary = (seq: number, coversFrom: number, coversTo: number): BoardEntryRow => ({
	authorAgentId: "smoother-1",
	body: `the settled account of ${coversFrom}..${coversTo}`,
	coversFrom,
	coversTo,
	createdAt: at(3, 23),
	id: `summary-${seq}`,
	kind: "summary",
	level: "day",
	precedence: "routine",
	register: "smooth",
	seq,
	sourceRef: null,
});

const admiralNote = (seq: number): BoardEntryRow => ({ ...rough(seq, 1, 9), authorAgentId: null, id: `admiral-${seq}`, register: "smooth" });

describe("uncovered days", () => {
	it("groups every uncovered rough entry by its local day, today included", () => {
		const entries = [rough(1, 1, 9), rough(2, 1, 17), rough(3, 2, 8), summary(4, 1, 2), rough(5, 2, 20), rough(6, 3, 7)];
		expect(uncoveredDays(entries)).toMatchObject([
			{ coversFrom: 3, coversTo: 5, day: "2026-09-02", entries: [{ id: "rough-3" }, { id: "rough-5" }] },
			{ coversFrom: 6, coversTo: 6, day: "2026-09-03", entries: [{ id: "rough-6" }] },
		]);
	});

	it("leaves nothing to smooth once a summary covers the range", () => {
		expect(uncoveredDays([rough(1, 1, 9), rough(2, 1, 17), summary(3, 1, 2)])).toEqual([]);
	});

	it("never offers what the admiral wrote to a smoother", () => {
		expect(uncoveredDays([admiralNote(1)])).toEqual([]);
	});
});

describe("uncovered span", () => {
	it("gathers every uncovered rough entry into one span, however many days it took", () => {
		const entries = [rough(1, 1, 9), rough(2, 2, 17), summary(3, 1, 1), rough(4, 3, 8)];
		expect(Option.getOrThrow(uncoveredSpan(entries))).toMatchObject({ coversFrom: 2, coversTo: 4, entries: [{ id: "rough-2" }, { id: "rough-4" }] });
	});

	it("offers no span when nothing stands uncovered", () => {
		expect(uncoveredSpan([rough(1, 1, 9), summary(2, 1, 1)])).toEqual(Option.none());
	});
});

describe("digest", () => {
	it("returns the summary in place of the entries it covers, newest first", () => {
		const entries = [rough(1, 1, 9), rough(2, 1, 17), summary(3, 1, 2), rough(4, 2, 8), admiralNote(5)];
		expect(digestOf(entries).map((entry) => entry.id)).toEqual(["admiral-5", "rough-4", "summary-3"]);
	});

	it("opens a summary onto the entries it covers", () => {
		const entries = [rough(1, 1, 9), rough(2, 1, 17), summary(3, 1, 2), rough(4, 2, 8)];
		expect(entriesUnder(entries, "summary-3").map((entry) => entry.id)).toEqual(["rough-2", "rough-1"]);
		expect(entriesUnder(entries, "summary-9")).toEqual([]);
	});
});
