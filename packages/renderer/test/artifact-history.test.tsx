// why: @vitest-environment happy-dom exercises the real React click boundary.

import type { PieceView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { PieceOutcomes } from "#views/piece-outcomes.tsx";

const { readArtifactMarkdown, readReportMarkdown } = vi.hoisted(() => ({
	readArtifactMarkdown: vi.fn(
		(
			artifactId: string,
			onDone: (artifact: {
				readonly artifactId: string;
				readonly byteSize: number;
				readonly digest: string;
				readonly markdown: string;
				readonly title: string;
			}) => void,
			_onError: (message: string) => void,
		) => {
			const title =
				artifactId === "artifact-old" ? "Old chart" : "Current chart";
			return onDone({
				artifactId,
				byteSize: 42,
				digest: "0".repeat(64),
				markdown: `# ${title}\n\n\`\`\`mermaid\ngraph TD\nA-->B\n\`\`\``,
				title,
			});
		},
	),
	readReportMarkdown: vi.fn(),
}));

const { openWindow } = vi.hoisted(() => ({ openWindow: vi.fn() }));

vi.mock("#adapters/trpc-windows.ts", () => ({ openWindow }));

vi.mock("#adapters/trpc-voyages.ts", () => ({
	readArtifactMarkdown,
	readReportMarkdown,
}));
vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(() => Promise.resolve({ svg: '<svg aria-label="chart" />' })),
	},
}));

const artifact = {
	authorAgentId: "agent-chart",
	byteSize: 15,
	digest: "0".repeat(64),
	id: "artifact-current",
	title: "Current chart",
};

const piece: PieceView = {
	agents: [],
	artifactHistory: [
		{
			...artifact,
			id: "artifact-old",
			successorArtifactId: artifact.id,
			title: "Old chart",
		},
	],
	artifacts: [artifact],
	changes: [],
	charter: "draw the reef",
	dependsOn: [],
	expectation: "a chart lands",
	id: "piece-chart",
	launchedAt: null,
	parkedAt: null,
	reports: [],
	role: "cartographer",
	state: "done",
	title: "Chart",
};

it("keeps superseded Artifacts behind an explicit History disclosure", () => {
	const html = renderToStaticMarkup(
		<PieceOutcomes onError={() => undefined} piece={piece} />,
	);

	expect(html).toContain("Current chart");
	expect(html).toContain("History");
	expect(html).toContain("Old chart");
	expect(html).not.toContain("<a");
	expect(html).not.toContain("href=");
});

it.effect("reads and renders current and historical Artifacts on click", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<PieceOutcomes onError={() => undefined} piece={piece} />);
				return Promise.resolve();
			}),
		);
		const current = [...container.querySelectorAll("button")].find((button) =>
			button.textContent?.includes("Current chart"),
		);
		expect(current).toBeDefined();

		yield* Effect.promise(() =>
			act(() => {
				current?.click();
				return Promise.resolve();
			}),
		);

		expect(readArtifactMarkdown).toHaveBeenCalledWith(
			"artifact-current",
			expect.any(Function),
			expect.any(Function),
		);
		expect(container.querySelector("h1")?.textContent).toBe("Current chart");
		expect(container.querySelector("[data-mermaid]")?.innerHTML).toContain(
			'aria-label="chart"',
		);

		container.querySelector("details")?.setAttribute("open", "");
		const historical = [...container.querySelectorAll("button")].find(
			(button) => button.textContent?.includes("Old chart"),
		);
		yield* Effect.promise(() =>
			act(() => {
				historical?.click();
				return Promise.resolve();
			}),
		);
		expect(readArtifactMarkdown).toHaveBeenLastCalledWith(
			"artifact-old",
			expect.any(Function),
			expect.any(Function),
		);
		expect(container.querySelector("h1")?.textContent).toBe("Old chart");
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				return Promise.resolve();
			}),
		);
	}),
);

// why: the control names the Artifact on show, so it can never detach a
// window onto whichever Artifact happened to be read first.
it.effect("opens the Artifact on show in a window of its own", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<PieceOutcomes onError={() => undefined} piece={piece} />);
				return Promise.resolve();
			}),
		);
		container.querySelector("details")?.setAttribute("open", "");
		const historical = [...container.querySelectorAll("button")].find(
			(button) => button.textContent?.includes("Old chart"),
		);
		yield* Effect.promise(() =>
			act(() => {
				historical?.click();
				return Promise.resolve();
			}),
		);

		const detach = [...container.querySelectorAll("button")].find((button) =>
			button.textContent?.includes("open in a window"),
		);
		expect(detach).toBeDefined();
		yield* Effect.promise(() =>
			act(() => {
				detach?.click();
				return Promise.resolve();
			}),
		);

		expect(openWindow).toHaveBeenCalledWith(
			{ artifactId: "artifact-old", role: "artifact" },
			expect.any(Function),
		);
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				return Promise.resolve();
			}),
		);
	}),
);

it.effect("shows an Artifact read failure in its detail", () =>
	Effect.gen(function* () {
		readArtifactMarkdown.mockImplementationOnce(
			(_artifactId, _onDone, onError) => onError("stored Artifact is missing"),
		);
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<PieceOutcomes onError={() => undefined} piece={piece} />);
				return Promise.resolve();
			}),
		);
		const current = [...container.querySelectorAll("button")].find((button) =>
			button.textContent?.includes("Current chart"),
		);
		yield* Effect.promise(() =>
			act(() => {
				current?.click();
				return Promise.resolve();
			}),
		);

		expect(container.textContent).toContain("stored Artifact is missing");
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				return Promise.resolve();
			}),
		);
	}),
);
