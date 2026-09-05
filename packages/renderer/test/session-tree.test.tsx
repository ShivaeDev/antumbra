import type { SessionTree } from "@antumbra/contract";
import { sessionTree } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import type { TranscriptDelegation } from "#transcript/model.ts";
import { SessionTreePanel } from "#views/session-tree.tsx";
import { TranscriptRow } from "#views/transcript-row.tsx";

const panel = (selected: string, onSelect: (id: string) => void) => (
	<SessionTreePanel error={undefined} onSelect={onSelect} rootName="navigator" selected={selected} tree={sessionTree} />
);

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const render = (root: Root, element: React.ReactElement): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.render(element);
			return Promise.resolve();
		}),
	);

const clickAt = (container: HTMLElement, at: number): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			container.querySelectorAll("button")[at]?.click();
			return Promise.resolve();
		}),
	);

const drop = (root: Root): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.unmount();
			return Promise.resolve();
		}),
	);

it("collapses delegated sessions into their durable open count", () => {
	const markup = renderToStaticMarkup(panel("session-1", () => undefined));
	expect(markup).toContain("3 subsessions · 1 open");
	expect(markup).toContain('aria-expanded="false"');
	expect(markup).not.toContain("Map the quay grouping");
});

it("hides a tree with no delegated session", () => {
	const rootOnly: SessionTree = { ...sessionTree, alive: 1, nodes: sessionTree.nodes.slice(0, 1), total: 1 };
	const markup = renderToStaticMarkup(
		<SessionTreePanel error={undefined} onSelect={() => undefined} rootName="navigator" selected="session-1" tree={rootOnly} />,
	);
	expect(markup).toBe("");
});

it.effect("expands to plain session states and opens the selected transcript", () =>
	Effect.gen(function* () {
		const opened: string[] = [];
		const { container, root } = mount();
		yield* render(
			root,
			panel("session-1", (id) => opened.push(id)),
		);
		yield* clickAt(container, 0);
		expect(container.textContent).toContain("navigatorOpen");
		expect(container.textContent).toContain("Map the quay groupingFinished");
		expect(container.textContent).toContain("reef-surveyorOpen · Record incomplete");
		yield* clickAt(container, 3);
		expect(opened).toEqual(["session-1-node-2"]);
		yield* drop(root);
	}),
);

const delegation: TranscriptDelegation = {
	displayName: "Map the quay grouping",
	kind: "delegation",
	nodeId: "session-1-node-1",
	outcome: "completed",
	seq: 4,
	state: "ended",
};

it("a delegation mark says what was handed off and how it ended", () => {
	const markup = renderToStaticMarkup(<TranscriptRow item={delegation} onOpenNode={() => undefined} />);
	expect(markup).toContain("subsession");
	expect(markup).toContain("Map the quay grouping");
	expect(markup).toContain("Finished");
	expect(markup).not.toContain(">completed<");
});

it.effect("a delegation mark leads to the node holding the work", () =>
	Effect.gen(function* () {
		const opened: string[] = [];
		const { container, root } = mount();
		yield* render(root, <TranscriptRow item={delegation} onOpenNode={(id) => opened.push(id)} />);
		yield* clickAt(container, 0);
		expect(opened).toEqual(["session-1-node-1"]);
		yield* drop(root);
	}),
);

it("a mark with no node behind it is drawn without a link", () => {
	const markup = renderToStaticMarkup(<TranscriptRow item={{ ...delegation, nodeId: undefined }} onOpenNode={() => undefined} />);
	expect(markup).toContain("Map the quay grouping");
	expect(markup).not.toContain("<button");
});

it("a gap notice is stated in the margin, never coloured as a failure", () => {
	const markup = renderToStaticMarkup(
		<TranscriptRow
			item={{
				detail: "the stream detached 4200ms after this node opened",
				kind: "notice",
				seq: 7,
				title: "the stream stopped before this work reported an ending",
			}}
		/>,
	);
	expect(markup).toContain("gap");
	expect(markup).toContain("the stream stopped before this work reported");
	expect(markup).not.toContain("destructive");
});
