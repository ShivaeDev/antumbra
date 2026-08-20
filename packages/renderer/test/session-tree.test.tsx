// why: @vitest-environment happy-dom draws the tree the way the pane does.

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
	<SessionTreePanel
		error={undefined}
		onSelect={onSelect}
		rootName="navigator"
		selected={selected}
		tree={sessionTree}
	/>
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

it("lists every node the tree holds and says how many are still open", () => {
	const markup = renderToStaticMarkup(panel("session-1", () => undefined));
	expect(markup).toContain("session tree");
	expect(markup).toContain("2 of 4 open");
	expect(markup).toContain("Map the quay grouping");
	expect(markup).toContain("reef-surveyor");
	expect(markup).toContain("Unnamed Subagent");
});

// why: the root is the Agent's own Session, so it wears the Agent's role
// rather than the last resort of a rule written for subsessions.
it("names the root after the Agent and indents the rest by their depth", () => {
	const markup = renderToStaticMarkup(panel("session-1", () => undefined));
	expect(markup).toContain(">navigator<");
	expect(markup).toContain("pl-1.5");
	expect(markup).toContain("pl-4");
	expect(markup).toContain("pl-6");
});

it("wears every completeness the audit can leave behind, quietly", () => {
	const markup = renderToStaticMarkup(panel("session-1", () => undefined));
	expect(markup).toContain(">recording<");
	expect(markup).toContain(">complete<");
	expect(markup).toContain(">incomplete<");
	expect(markup).toContain(">unaudited<");
	expect(markup).toContain(">completed<");
	expect(markup).toContain(">unknown<");
});

it.effect("a node is the click target that opens its own transcript", () =>
	Effect.gen(function* () {
		const opened: string[] = [];
		const { container, root } = mount();
		yield* render(
			root,
			panel("session-1", (id) => opened.push(id)),
		);
		yield* clickAt(container, 2);
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
	const markup = renderToStaticMarkup(
		<TranscriptRow item={delegation} onOpenNode={() => undefined} />,
	);
	expect(markup).toContain("subsession");
	expect(markup).toContain("Map the quay grouping");
	expect(markup).toContain("completed");
});

it.effect("a delegation mark leads to the node holding the work", () =>
	Effect.gen(function* () {
		const opened: string[] = [];
		const { container, root } = mount();
		yield* render(
			root,
			<TranscriptRow item={delegation} onOpenNode={(id) => opened.push(id)} />,
		);
		yield* clickAt(container, 0);
		expect(opened).toEqual(["session-1-node-1"]);
		yield* drop(root);
	}),
);

// why: a marker the tree cannot place is still a fact about the transcript, so
// it is drawn and simply leads nowhere rather than being dropped or faked.
it("a mark with no node behind it is drawn without a link", () => {
	const markup = renderToStaticMarkup(
		<TranscriptRow
			item={{ ...delegation, nodeId: undefined }}
			onOpenNode={() => undefined}
		/>,
	);
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
