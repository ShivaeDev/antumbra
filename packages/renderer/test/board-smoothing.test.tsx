import type { BoardSmoothing } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { mount, settle } from "#test/dom.ts";
import { BoardPanel } from "#views/board.tsx";
import { SmoothingLine, SmoothNow } from "#views/board-smoothing.tsx";

const header = (smoothing: BoardSmoothing) => renderToStaticMarkup(<SmoothNow onSmooth={() => undefined} smoothing={smoothing} />);

const body = (smoothing: BoardSmoothing) => renderToStaticMarkup(<SmoothingLine onSmooth={() => undefined} smoothing={smoothing} />);

const clicked = (label: string, smoothing: BoardSmoothing) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		let smoothed = 0;
		yield* settle(() =>
			root.render(
				<>
					<SmoothNow onSmooth={() => smoothed++} smoothing={smoothing} />
					<SmoothingLine onSmooth={() => smoothed++} smoothing={smoothing} />
				</>,
			),
		);
		yield* settle(() => [...container.querySelectorAll("button")].find((button) => button.textContent === label)?.click());
		return smoothed;
	}).pipe(Effect.scoped);

it("offers the pass only while rough entries stand uncovered", () => {
	expect(header({ state: "idle", uncovered: 9 })).toContain("Smooth now");
	expect(header({ state: "idle", uncovered: 9 })).not.toContain('disabled=""');
	expect(header({ state: "idle", uncovered: 0 })).toContain('disabled=""');
	expect(header({ state: "running", uncovered: 9 })).toContain('disabled=""');
});

it("says what is being smoothed while the pass runs, and nothing when none does", () => {
	expect(body({ state: "running", uncovered: 9 })).toContain("Smoothing 9 entries");
	expect(body({ state: "running", uncovered: 1 })).toContain("Smoothing 1 entry");
	expect(body({ state: "idle", uncovered: 9 })).toBe("");
});

it("stands the failure where the summary would have landed, with the retry beside it", () => {
	expect(body({ state: "failed", uncovered: 9 })).toContain("Smoothing failed");
	expect(body({ state: "failed", uncovered: 9 })).toContain("Try again");
});

it("never offers the pass on a piece board", () => {
	expect(renderToStaticMarkup(<BoardPanel entries={[]} name="soundings" scope={{ kind: "piece", pieceId: "piece-1" }} />)).not.toContain(
		"Smooth now",
	);
});

it.effect("asks for a pass from the header and again from the failure", () =>
	Effect.gen(function* () {
		expect(yield* clicked("Smooth now", { state: "idle", uncovered: 9 })).toBe(1);
		expect(yield* clicked("Smooth now", { state: "idle", uncovered: 0 })).toBe(0);
		expect(yield* clicked("Try again", { state: "failed", uncovered: 9 })).toBe(1);
	}),
);
