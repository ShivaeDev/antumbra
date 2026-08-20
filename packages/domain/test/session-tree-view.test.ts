import { UNNAMED_SUBSESSION } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import {
	assembleSessionTree,
	type SessionTreeRow,
} from "#session-tree-view.ts";

const row = (
	id: string,
	fields: Partial<SessionTreeRow> = {},
): SessionTreeRow => ({
	completeness: "recording",
	id,
	kind: null,
	label: null,
	nativeRef: `native-${id}`,
	outcome: null,
	parentSessionId: null,
	status: "open",
	...fields,
});

const placed = (
	rows: ReadonlyArray<SessionTreeRow>,
): ReadonlyArray<readonly [string, number]> =>
	assembleSessionTree("root", rows).nodes.map(
		(node) => [node.id, node.depth] as const,
	);

const named = (fields: Partial<SessionTreeRow>): string => {
	const [, node] = assembleSessionTree("root", [
		row("root"),
		row("node", { parentSessionId: "root", ...fields }),
	]).nodes;
	return node?.displayName ?? "";
};

describe("assembleSessionTree", () => {
	it("walks root, child and grandchild, taking depth from the walk", () => {
		expect(
			placed([
				row("root"),
				row("child", { parentSessionId: "root" }),
				row("grandchild", { parentSessionId: "child" }),
			]),
		).toEqual([
			["root", 0],
			["child", 1],
			["grandchild", 2],
		]);
	});

	it("an edge pointing back at the root finishes the walk instead of circling", () => {
		expect(
			placed([
				row("root", { parentSessionId: "child" }),
				row("child", { parentSessionId: "root" }),
			]),
		).toEqual([
			["root", 0],
			["child", 1],
		]);
	});

	it("a cycle the root cannot reach degrades to a flat listing under it", () => {
		expect(
			placed([
				row("root"),
				row("child", { parentSessionId: "grandchild" }),
				row("grandchild", { parentSessionId: "child" }),
			]),
		).toEqual([
			["root", 0],
			["child", 1],
			["grandchild", 1],
		]);
	});

	it("a row whose parent is not in this tree is still part of the record", () => {
		expect(
			placed([
				row("root"),
				row("child", { parentSessionId: "root" }),
				row("orphan", { parentSessionId: "session-elsewhere" }),
			]),
		).toEqual([
			["root", 0],
			["child", 1],
			["orphan", 1],
		]);
	});

	it("names a node by its label first", () => {
		expect(named({ kind: "Explore", label: "Map the quay grouping" })).toBe(
			"Map the quay grouping",
		);
	});

	it("names a node the provider identified only by an agent path", () => {
		expect(named({ kind: ".codex/agents/reef-surveyor.md" })).toBe(
			"reef-surveyor",
		);
	});

	it("names a node by the kind the provider stated", () => {
		expect(named({ kind: "general-purpose" })).toBe("general-purpose");
	});

	it("says outright that nothing named a node", () => {
		expect(named({})).toBe(UNNAMED_SUBSESSION);
		expect(UNNAMED_SUBSESSION).toBe("Unnamed Subagent");
	});

	it("counts what is open against everything the tree holds", () => {
		const tree = assembleSessionTree("root", [
			row("root"),
			row("child", { parentSessionId: "root", status: "closed" }),
			row("grandchild", { parentSessionId: "child" }),
			row("fourth", { parentSessionId: "root", status: "closed" }),
		]);
		expect(tree.alive).toBe(2);
		expect(tree.total).toBe(4);
		expect(tree.rootSessionId).toBe("root");
	});

	it("carries the ending and the audit of every node it lists", () => {
		const tree = assembleSessionTree("root", [
			row("root"),
			row("child", {
				completeness: "incomplete",
				outcome: "interrupted",
				parentSessionId: "root",
				status: "closed",
			}),
		]);
		expect(tree.nodes[1]).toMatchObject({
			completeness: "incomplete",
			nativeRef: "native-child",
			outcome: "interrupted",
			status: "closed",
		});
	});
});
