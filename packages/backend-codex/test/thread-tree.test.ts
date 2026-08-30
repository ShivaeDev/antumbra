import { describe, expect, it } from "vitest";
import { openThreadClaims } from "#thread-claims.ts";
import { openThreadTree } from "#thread-tree.ts";

// why: fixtures in the shape app-server broadcasts them — every frame of every
// thread on one connection, each stamped with the thread that spoke it. The
// tree is what turns that one stream back into the several conversations it is.
const ROOT = "019ff334-ec21-7373-a31e-e8a0db309020";
const CHILD = "019ff400-1111-7373-a31e-e8a0db309021";
const NIECE = "019ff400-2222-7373-a31e-e8a0db309022";
const GUARDIAN = "019ff400-3333-7373-a31e-e8a0db309023";
const TURN = "019ff334-ed58-7ff3-8dfb-1ceb96c93ccd";

const tree = () => openThreadTree(ROOT, openThreadClaims());

const item = (method: string, threadId: string, payload: Record<string, unknown>) => ({ method, params: { item: payload, threadId, turnId: TURN } });

const said = (threadId: string, text: string) =>
	item("item/completed", threadId, {
		id: `msg_${text}`,
		text,
		type: "agentMessage",
	});

const spawnedThread = (id: string, parent: string) => ({
	method: "thread/started",
	params: {
		thread: {
			id,
			source: { subAgent: { thread_spawn: { parent_thread_id: parent } } },
		},
	},
});

const reviewerThread = (id: string) => ({
	method: "thread/started",
	params: {
		thread: { id, parentThreadId: ROOT, source: { subAgent: "review" } },
	},
});

const activity = (threadId: string, agentThreadId: string, kind: string, id = "sub_1") =>
	item("item/started", threadId, {
		agentPath: ".codex/agents/auditor.md",
		agentThreadId,
		id,
		kind,
		type: "subAgentActivity",
	});

const collabCall = (method: string, threadId: string, receiver: string, id = "collab_1") =>
	item(method, threadId, {
		agentsStates: {},
		id,
		prompt: "audit the ledger",
		receiverThreadIds: [receiver],
		senderThreadId: threadId,
		status: "completed",
		tool: "spawnAgent",
		type: "collabAgentToolCall",
	});

const review = (threadId: string, status: string) => ({
	method: "item/autoApprovalReview/completed",
	params: {
		action: {
			command: "rm -rf /",
			cwd: "/moorage",
			source: "shell",
			type: "command",
		},
		review: { rationale: "destructive", riskLevel: "critical", status },
		reviewId: "review_1",
		threadId,
		turnId: TURN,
	},
});

describe("the tree un-filters what codex broadcasts", () => {
	it("a thread nothing tied to this tree is not this session's to read", () => {
		const reading = tree();
		expect(reading.events(said(CHILD, "not mine"))).toEqual([]);
	});

	it("a spawned thread is admitted and its words carry its own attribution", () => {
		const reading = tree();
		expect(reading.events(spawnedThread(CHILD, ROOT))).toEqual([]);
		const [spoken] = reading.events(said(CHILD, "the ledger reads clean"));
		expect(spoken).toMatchObject({
			origin: { node: CHILD, spawnedBy: CHILD },
			text: "the ledger reads clean",
			type: "message",
		});
	});

	it("the root's own words carry no attribution at all", () => {
		const reading = tree();
		const [spoken] = reading.events(said(ROOT, "on it"));
		expect(spoken).toMatchObject({ type: "message" });
		expect(spoken !== undefined && "origin" in spoken).toBe(false);
	});

	it("a reviewer thread is never a member of the tree", () => {
		const reading = tree();
		expect(reading.events(reviewerThread(GUARDIAN))).toEqual([]);
		expect(reading.events(said(GUARDIAN, "looks risky"))).toEqual([]);
	});

	it("a verdict is recorded with the thread whose action it judged", () => {
		const reading = tree();
		const [judged] = reading.events(review(ROOT, "denied"));
		expect(judged?.type).toBe("raw");
		expect(judged?.raw.payload).toContain("critical");
		expect(judged?.raw.payload).toContain("denied");
	});

	it("a node's verdict lands on the node, and mints nothing of its own", () => {
		const reading = tree();
		reading.events(spawnedThread(CHILD, ROOT));
		const [judged] = reading.events(review(CHILD, "approved"));
		expect(judged).toMatchObject({ origin: { node: CHILD }, type: "raw" });
	});
});

describe("the tree reads what codex says about its own agents", () => {
	it("the spawn call reads as the tool call it is and admits the receiver", () => {
		const reading = tree();
		const [started] = reading.events(collabCall("item/started", ROOT, CHILD));
		expect(started).toMatchObject({
			input: "audit the ledger",
			name: "spawnAgent",
			toolId: "collab_1",
			type: "tool.started",
		});
		const [spoken] = reading.events(said(CHILD, "reading"));
		expect(spoken).toMatchObject({
			origin: { node: CHILD, spawnedBy: "collab_1" },
		});
	});

	it("the announcement names the node, its parent thread, and its spawning call", () => {
		const reading = tree();
		reading.events(collabCall("item/started", ROOT, CHILD));
		const [opened] = reading.events(activity(ROOT, CHILD, "started"));
		expect(opened).toEqual({
			kind: ".codex/agents/auditor.md",
			parentRef: ROOT,
			raw: expect.objectContaining({ source: "codex" }),
			spawnedBy: "collab_1",
			subsessionRef: CHILD,
			type: "subsession.opened",
		});
	});

	it("an announcement repeated as the item completes opens nothing twice", () => {
		const reading = tree();
		reading.events(activity(ROOT, CHILD, "started"));
		const [repeated] = reading.events(
			item("item/completed", ROOT, {
				agentPath: ".codex/agents/auditor.md",
				agentThreadId: CHILD,
				id: "sub_1",
				kind: "started",
				type: "subAgentActivity",
			}),
		);
		expect(repeated?.type).toBe("raw");
	});

	it("a node announced by a node is spawned by that node's own call", () => {
		const reading = tree();
		reading.events(spawnedThread(CHILD, ROOT));
		reading.events(collabCall("item/started", CHILD, NIECE, "collab_2"));
		const [opened] = reading.events(activity(CHILD, NIECE, "started", "sub_2"));
		expect(opened).toMatchObject({
			parentRef: CHILD,
			spawnedBy: "collab_2",
			subsessionRef: NIECE,
			type: "subsession.opened",
		});
	});

	it("codex's word for a forced ending folds onto ours", () => {
		const reading = tree();
		reading.events(activity(ROOT, CHILD, "started"));
		const [ended] = reading.events(activity(ROOT, CHILD, "interrupted", "sub_2"));
		expect(ended).toMatchObject({
			outcome: "interrupted",
			subsessionRef: CHILD,
			type: "subsession.ended",
		});
	});

	it("a thread closed with no word for how it ended ends as unknown", () => {
		const reading = tree();
		reading.events(spawnedThread(CHILD, ROOT));
		const [ended] = reading.events({
			method: "thread/closed",
			params: { threadId: CHILD },
		});
		expect(ended).toMatchObject({
			outcome: "unknown",
			subsessionRef: CHILD,
			type: "subsession.ended",
		});
		expect(ended?.type === "subsession.ended" && ended.raw.kind).toBe("thread/closed");
	});
});
