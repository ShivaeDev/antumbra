import type { PieceView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { PieceOutcomes } from "#views/piece-outcomes.tsx";

const { readArtifactMarkdown, readReportMarkdown } = vi.hoisted(() => ({
	readArtifactMarkdown: vi.fn(),
	readReportMarkdown: vi.fn(
		(
			reportId: string,
			onDone: (report: {
				readonly authorAgentId: string | null;
				readonly markdown: string;
				readonly reportId: string;
				readonly title: string;
			}) => void,
			_onError: (message: string) => void,
		) =>
			onDone({
				authorAgentId: "agent-sounder",
				markdown: "# Soundings\n\nThe eastern shoal is steeper than charted.",
				reportId,
				title: "Soundings",
			}),
	),
}));

vi.mock("#adapters/trpc-voyages.ts", () => ({
	readArtifactMarkdown,
	readReportMarkdown,
}));
vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(() => Promise.resolve({ svg: "<svg />" })),
	},
}));

const piece: PieceView = {
	agents: [],
	artifactHistory: [],
	artifacts: [],
	awaitingRulings: [],
	board: [],
	canRetireCrew: false,
	changes: [],
	charter: "sound the eastern shoal",
	dependsOn: [],
	expectation: "a report lands",
	id: "piece-soundings",
	launchedAt: null,
	parkedAt: null,
	reports: [{ authorAgentId: "agent-sounder", id: "report-1", title: "Soundings" }],
	role: "hand",
	state: "done",
	title: "Soundings",
};

it("shows a landed report as an openable chip and nothing else", () => {
	const html = renderToStaticMarkup(<PieceOutcomes onError={() => undefined} piece={piece} />);

	expect(html).toContain("Soundings");
	expect(html).toContain("<button");
	expect(html).not.toContain("The eastern shoal is steeper than charted.");
	expect(html).not.toContain("<a");
	expect(html).not.toContain("href=");
});

it.effect("reads and renders a report body on click", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<PieceOutcomes onError={() => undefined} piece={piece} />);
				return Promise.resolve();
			}),
		);
		const chip = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Soundings"));
		expect(chip).toBeDefined();

		yield* Effect.promise(() =>
			act(() => {
				chip?.click();
				return Promise.resolve();
			}),
		);

		expect(readReportMarkdown).toHaveBeenCalledWith("report-1", expect.any(Function), expect.any(Function));
		expect(container.querySelector("h1")?.textContent).toBe("Soundings");
		expect(container.textContent).toContain("The eastern shoal is steeper than charted.");
		expect(container.textContent).toContain("report by agent-sounder");
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				return Promise.resolve();
			}),
		);
	}),
);

it.effect("shows a report read failure in its detail", () =>
	Effect.gen(function* () {
		readReportMarkdown.mockImplementationOnce((_reportId, _onDone, onError) => onError("no such report: report-1"));
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<PieceOutcomes onError={() => undefined} piece={piece} />);
				return Promise.resolve();
			}),
		);
		const chip = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Soundings"));
		yield* Effect.promise(() =>
			act(() => {
				chip?.click();
				return Promise.resolve();
			}),
		);

		expect(container.textContent).toContain("no such report: report-1");
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				return Promise.resolve();
			}),
		);
	}),
);
