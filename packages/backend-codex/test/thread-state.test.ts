import { describe, expect, it } from "vitest";
import { toAgentEvents } from "#mapping.ts";

// why: fixtures are the app-server's own shapes at the pinned version — the
// status notification with its active flags, the turn edges, and the token
// breakdown with all four counts on it.
const THREAD = "019ff334-ec21-7373-a31e-e8a0db309020";
const TURN = "019ff334-ed58-7ff3-8dfb-1ceb96c93ccd";

const status = (params: Record<string, unknown>) => ({
	method: "thread/status/changed",
	params: { status: params, threadId: THREAD },
});

const turn = (method: string, turnStatus: string) => ({
	method,
	params: {
		threadId: THREAD,
		turn: { durationMs: 12300, error: null, id: TURN, status: turnStatus },
	},
});

const tokens = (last: Record<string, number>) => ({
	method: "thread/tokenUsage/updated",
	params: {
		threadId: THREAD,
		tokenUsage: {
			last,
			modelContextWindow: 272000,
			total: { ...last, inputTokens: last.inputTokens ?? 0 },
		},
		turnId: TURN,
	},
});

describe("what codex says a thread is doing is kept", () => {
	it("an active thread is running until a flag says it is waiting", () => {
		expect(
			toAgentEvents(status({ activeFlags: [], type: "active" })),
		).toMatchObject([{ state: "running", type: "session.state" }]);
		expect(
			toAgentEvents(
				status({ activeFlags: ["waitingOnApproval"], type: "active" }),
			),
		).toMatchObject([{ state: "awaiting-input", type: "session.state" }]);
		expect(
			toAgentEvents(
				status({ activeFlags: ["waitingOnUserInput"], type: "active" }),
			),
		).toMatchObject([{ state: "awaiting-input", type: "session.state" }]);
		expect(toAgentEvents(status({ type: "idle" }))).toMatchObject([
			{ state: "idle", type: "session.state" },
		]);
	});

	// why: a thread with no process and a thread that broke are not states this
	// vocabulary has, and calling either idle would say the session is quietly
	// listening when it is not. They stay evidence instead.
	it("leaves notLoaded and systemError raw rather than calling them idle", () => {
		expect(toAgentEvents(status({ type: "notLoaded" }))).toMatchObject([
			{ raw: { kind: "thread/status/changed" }, type: "raw" },
		]);
		expect(toAgentEvents(status({ type: "systemError" }))).toMatchObject([
			{ type: "raw" },
		]);
	});

	it("the turn edges are the session going busy and going quiet", () => {
		expect(toAgentEvents(turn("turn/started", "inProgress"))).toMatchObject([
			{ state: "running", type: "session.state" },
		]);
		expect(toAgentEvents(turn("turn/completed", "completed"))).toMatchObject([
			{ durationMs: 12300, status: "completed", type: "turn.completed" },
			{ state: "idle", type: "session.state" },
		]);
	});

	it("splits the turn's tokens and claims no money codex never named", () => {
		const [usage] = toAgentEvents(
			tokens({
				cachedInputTokens: 96240,
				cacheWriteInputTokens: 12100,
				inputTokens: 1410,
				outputTokens: 210,
				reasoningOutputTokens: 64,
				totalTokens: 109960,
			}),
		);
		expect(usage).toMatchObject({
			cacheReadTokens: 96240,
			cacheWriteTokens: 12100,
			inputTokens: 1410,
			outputTokens: 210,
			type: "usage",
		});
		expect(usage).not.toHaveProperty("costUsd");
		expect(usage).not.toHaveProperty("cumulativeCostUsd");
	});

	// why: cacheWriteInputTokens carries a default on the wire, so an older
	// server may not send it. Absent must stay absent — writing it as zero would
	// claim the turn wrote no cache when nobody said so.
	it("leaves an unreported cache write out rather than writing it as zero", () => {
		const [usage] = toAgentEvents(
			tokens({
				cachedInputTokens: 0,
				inputTokens: 1410,
				outputTokens: 210,
				reasoningOutputTokens: 0,
				totalTokens: 1620,
			}),
		);
		expect(usage).toMatchObject({ cacheReadTokens: 0, inputTokens: 1410 });
		expect(usage).not.toHaveProperty("cacheWriteTokens");
	});
});
