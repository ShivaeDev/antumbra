import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";

// why: `announced` separates a node the record was told about from one it
// admitted on its own, having heard the node speak before anything named it.
// The difference decides what a later opening means: a name for a node already
// announced, or the adoption of one the record minted to keep its words.
export interface TreeNode {
	readonly announced: boolean;
	readonly openedAt: number;
	readonly sessionId: string;
	readonly spawnerSessionId: string;
	readonly subsessionRef: string;
}

// why: the tree a running Session grew, held for as long as its stream is
// attached. It is never persisted: the durable tree is the rows and the log,
// and a restart re-reads the stream from the provider rather than a memory of
// one. Nodes are remembered after they close so a late frame still lands on the
// node that produced it; `open` is the smaller set that still owes an ending.
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

export const originOf = (event: AgentEvent): Origin | undefined =>
	"origin" in event ? event.origin : undefined;

// why: a frame names the tool call that spawned the node that produced it, and
// that node's opening named the same call — so the join is the tool id. A frame
// whose call this tree has never seen belongs to the root that owns the stream,
// never to nothing. When the frame names the node itself the join is that
// reference instead: siblings of one fanned-out call share a tool id and would
// otherwise all read as the last of them to open.
export const nodeOf = (
	tree: SessionTree,
	event: AgentEvent,
): TreeNode | undefined => {
	const origin = originOf(event);
	if (origin === undefined) {
		return undefined;
	}
	return origin.node === undefined
		? tree.spawned.get(origin.spawnedBy)
		: tree.nodes.get(origin.node);
};

// why: the spawner is whoever made the tool call, which at depth two is the
// depth-one node and not the root. Nothing in the opening frame says so; the
// only record is the journal the matching tool.started was written to. A
// provider that names the parent node instead of the call is answered from the
// tree, and one that names neither leaves the node on the root that owns the
// stream — never on nothing.
export const spawnerOf = (
	tree: SessionTree,
	spawn: {
		readonly parentRef?: string | undefined;
		readonly spawnedBy: string;
	},
	root: string,
): string =>
	tree.callers.get(spawn.spawnedBy) ??
	(spawn.parentRef === undefined
		? undefined
		: tree.nodes.get(spawn.parentRef)?.sessionId) ??
	root;

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

// why: adoption moves a node the record admitted for itself under the spawner
// that finally announced it, and registers the call that did the spawning so
// the node's siblings and its own children resolve through it afterwards.
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
