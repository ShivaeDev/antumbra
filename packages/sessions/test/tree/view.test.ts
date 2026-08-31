import { UNNAMED_SUBSESSION } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { assembleSessionTree, type SessionTreeRow } from "#tree/view.ts";

const row = (id: string, fields: Partial<SessionTreeRow> = {}): SessionTreeRow => ({
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

const placed = (rows: ReadonlyArray<SessionTreeRow>): ReadonlyArray<readonly [string, number]> =>
	assembleSessionTree("root", rows).nodes.map((node) => [node.id, node.depth] as const);

const named = (fields: Partial<SessionTreeRow>): string => {
	const [, node] = assembleSessionTree("root", [row("root"), row("node", { parentSessionId: "root", ...fields })]).nodes;
	return node?.displayName ?? "";
};

describe("assembleSessionTree", () => {
	it("walks root, child and grandchild, taking depth from the walk", () => {
		expect(placed([row("root"), row("child", { parentSessionId: "root" }), row("grandchild", { parentSessionId: "child" })])).toEqual([
			["root", 0],
			["child", 1],
			["grandchild", 2],
		]);
	});

	it("names a node by its label, then its kind, and says when neither names it", () => {
		expect(named({ kind: "Explore", label: "Map the quay grouping" })).toBe("Map the quay grouping");
		expect(named({ kind: ".codex/agents/reef-surveyor.md" })).toBe("reef-surveyor");
		expect(named({ kind: "general-purpose" })).toBe("general-purpose");
		expect(named({})).toBe(UNNAMED_SUBSESSION);
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
