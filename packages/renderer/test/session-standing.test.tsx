import type { SessionEvent, SessionSummary, SessionTreeNode } from "@antumbra/contract";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sessionActivity } from "#transcript/activity.ts";
import { sessionStanding } from "#transcript/standing.ts";
import { SessionStandingBar } from "#views/session-standing.tsx";

const raw = { kind: "wire/kind", payload: "{}", source: "scripted" };
const origin = { spawnedBy: "toolu_01" };

const row = (seq: number, event: AgentEvent): SessionEvent => ({ event: { _tag: "Known", event }, seq, sessionId: "session-1" });

const node = (depth: number, status: SessionTreeNode["status"], outcome: SessionTreeNode["outcome"] = null): SessionTreeNode => ({
	completeness: "recording",
	depth,
	displayName: depth === 0 ? "navigator" : "reef-surveyor",
	id: "session-1",
	nativeRef: null,
	outcome,
	status,
});

const markup = (events: ReadonlyArray<SessionEvent>, at?: SessionTreeNode, presence?: SessionSummary["presence"]): string => {
	const standing = sessionStanding(events, at);
	return renderToStaticMarkup(<SessionStandingBar activity={sessionActivity(standing, at, presence)} node={at} standing={standing} />);
};

describe("session standing", () => {
	it("keeps the latest state, background set and usage", () => {
		const standing = sessionStanding([
			row(0, { raw, state: "running", type: "session.state" }),
			row(1, { raw, tasks: [{ description: "pnpm ready", id: "bg-1", kind: "shell" }], type: "session.background" }),
			row(2, { raw, state: "awaiting-input", type: "session.state" }),
			row(3, { inputTokens: 10, outputTokens: 5, raw, type: "usage" }),
		]);
		expect(standing).toMatchObject({
			background: [{ description: "pnpm ready", id: "bg-1", kind: "shell" }],
			state: "awaiting-input",
			usage: { inputTokens: 10, outputTokens: 5 },
		});
	});

	it("reads attributed frames on a delegate without treating them as the root", () => {
		const events = [row(0, { raw, state: "running", type: "session.state" }), row(1, { origin, raw, state: "idle", type: "session.state" })];
		expect(sessionStanding(events, node(0, "open")).state).toBe("running");
		expect(sessionStanding(events, node(1, "open")).state).toBe("idle");
	});

	it("keeps calls open until their completion arrives", () => {
		const started = row(0, { input: "{}", name: "Bash", raw, toolId: "t-1", type: "tool.started" });
		expect(sessionStanding([started]).open).toEqual([{ name: "Bash" }]);
		expect(sessionStanding([started, row(1, { ok: true, output: "done", raw, toolId: "t-1", type: "tool.completed" })]).open).toEqual([]);
	});
});

describe("session standing bar", () => {
	it("wraps complete usage facts instead of truncating them", () => {
		const rendered = markup([
			row(0, { raw, state: "running", type: "session.state" }),
			row(1, { cacheReadTokens: 96_240, costUsd: 0.0188, cumulativeCostUsd: 0.06, inputTokens: 1410, outputTokens: 210, raw, type: "usage" }),
		]);
		expect(rendered).toContain("flex-wrap");
		expect(rendered).not.toContain("truncate");
		expect(rendered).toContain("cache read 96240");
		expect(rendered).toContain("session $0.0600");
	});

	it("uses the tree when a delegate has no state frame", () => {
		expect(markup([], node(1, "open"))).toContain("Open");
		expect(markup([], node(1, "closed", "completed"))).toContain("Finished");
	});

	it("reports an open call as live only while its session is working", () => {
		const events = [row(0, { input: "{}", name: "Bash", raw, toolId: "t-1", type: "tool.started" })];
		expect(markup(events, node(0, "open"), "working")).toContain("running Bash");
		expect(markup(events, node(0, "open"), "stranded")).toContain("stranded · Bash unfinished");
		expect(markup(events, node(0, "closed", "completed"), "working")).not.toContain("running Bash");
	});
});
