import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";

export interface TreeNode {
	readonly announced: boolean;
	readonly openedAt: number;
	readonly sessionId: string;
	readonly spawnerSessionId: string;
	readonly subsessionRef: string;
}

// Closed nodes stay indexed until detach so late provider frames keep their attribution.
export interface SessionTree {
	readonly callers: ReadonlyMap<string, string>;
	readonly nodes: ReadonlyMap<string, TreeNode>;
	readonly open: ReadonlySet<string>;
	readonly spawned: ReadonlyMap<string, TreeNode>;
}

export const emptySessionTree: SessionTree = {
	callers: new Map(),
	nodes: new Map(),
	open: new Set(),
	spawned: new Map(),
};

export const originOf = (event: AgentEvent): Origin | undefined => ("origin" in event ? event.origin : undefined);

export const nodeOf = (tree: SessionTree, event: AgentEvent): TreeNode | undefined => {
	const origin = originOf(event);
	if (origin === undefined) {
		return undefined;
	}
	return origin.node === undefined ? tree.spawned.get(origin.spawnedBy) : tree.nodes.get(origin.node);
};

export const spawnerOf = (
	tree: SessionTree,
	spawn: {
		readonly parentRef?: string | undefined;
		readonly spawnedBy: string;
	},
	root: string,
): string => tree.callers.get(spawn.spawnedBy) ?? (spawn.parentRef === undefined ? undefined : tree.nodes.get(spawn.parentRef)?.sessionId) ?? root;

export const withCaller =
	(toolId: string, sessionId: string) =>
	(tree: SessionTree): SessionTree => ({
		...tree,
		callers: new Map(tree.callers).set(toolId, sessionId),
	});

export const withNode =
	(node: TreeNode, spawnedBy: string) =>
	(tree: SessionTree): SessionTree => ({
		...tree,
		nodes: new Map(tree.nodes).set(node.subsessionRef, node),
		open: new Set(tree.open).add(node.subsessionRef),
		spawned: new Map(tree.spawned).set(spawnedBy, node),
	});

export const withAdopted =
	(node: TreeNode, spawnedBy: string, spawnerSessionId: string) =>
	(tree: SessionTree): SessionTree => {
		const adopted: TreeNode = { ...node, announced: true, spawnerSessionId };
		return {
			...tree,
			nodes: new Map(tree.nodes).set(adopted.subsessionRef, adopted),
			spawned: new Map(tree.spawned).set(spawnedBy, adopted),
		};
	};

export const withClosed =
	(subsessionRef: string) =>
	(tree: SessionTree): SessionTree => {
		const open = new Set(tree.open);
		open.delete(subsessionRef);
		return { ...tree, open };
	};

export const openNodes = (tree: SessionTree): ReadonlyArray<TreeNode> =>
	[...tree.open].flatMap((subsessionRef) => {
		const node = tree.nodes.get(subsessionRef);
		return node === undefined ? [] : [node];
	});
