// why: @vitest-environment happy-dom renders the bar the way the pane does.

import type { SessionEvent } from "@antumbra/contract";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deriveTranscript } from "#transcript/derive.ts";
import { sessionStanding } from "#transcript/standing.ts";
import { SessionStandingBar } from "#views/session-standing.tsx";

const raw = { kind: "wire/kind", payload: "{}", source: "scripted" };

const row = (seq: number, event: AgentEvent): SessionEvent => ({
	event: { _tag: "Known", event },
	seq,
	sessionId: "session-1",
});

const cached: AgentEvent = {
	cacheReadTokens: 96240,
	cacheWriteTokens: 0,
	costUsd: 0.0188,
	cumulativeCostUsd: 0.06,
	inputTokens: 1410,
	outputTokens: 210,
	raw,
	type: "usage",
};

const markup = (events: ReadonlyArray<SessionEvent>): string =>
	renderToStaticMarkup(
		<SessionStandingBar standing={sessionStanding(events)} />,
	);

describe("a session's standing is folded out of its own journal", () => {
	it("keeps the last state and the whole last background set", () => {
		const standing = sessionStanding([
			row(0, { raw, state: "running", type: "session.state" }),
			row(1, {
				raw,
				tasks: [{ description: "pnpm ready", id: "bg-1", kind: "shell" }],
				type: "session.background",
			}),
			row(2, { raw, state: "awaiting-input", type: "session.state" }),
		]);
		expect(standing.state).toBe("awaiting-input");
		expect(standing.background).toEqual([
			{ description: "pnpm ready", id: "bg-1", kind: "shell" },
		]);
	});

	// why: a background set is replaced, never merged — the provider sends the
	// whole live set, so an empty one is the last task finishing.
	it("an empty set replaces the tasks rather than leaving them standing", () => {
		const standing = sessionStanding([
			row(0, {
				raw,
				tasks: [{ description: "pnpm ready", id: "bg-1", kind: "shell" }],
				type: "session.background",
			}),
			row(1, { raw, tasks: [], type: "session.background" }),
		]);
		expect(standing.background).toEqual([]);
	});

	// why: a delegate's turn is not the root's. A subsession going idle while
	// the root waits on it would otherwise show the whole session at rest.
	it("ignores what a subsession says about itself", () => {
		const standing = sessionStanding([
			row(0, { raw, state: "running", type: "session.state" }),
			row(1, {
				origin: { spawnedBy: "toolu_01" },
				raw,
				state: "idle",
				type: "session.state",
			}),
		]);
		expect(standing.state).toBe("running");
	});

	it("shows the cache share, the turn's cost and the running total", () => {
		const rendered = markup([
			row(0, { raw, state: "running", type: "session.state" }),
			row(1, cached),
		]);
		expect(rendered).toContain("running");
		expect(rendered).toContain("99% cache");
		expect(rendered).toContain("cache read 96240");
		expect(rendered).toContain("in 1410");
		expect(rendered).toContain("out 210");
		expect(rendered).toContain("turn $0.0188");
		expect(rendered).toContain("total $0.0600");
	});

	it("says so plainly when the harness has reported nothing yet", () => {
		const rendered = markup([]);
		expect(rendered).toContain("state unreported");
		expect(rendered).toContain("no usage reported yet");
	});

	it("names the background work beside the state", () => {
		const rendered = markup([
			row(0, {
				raw,
				tasks: [
					{ description: "pnpm ready", id: "bg-1", kind: "shell" },
					{ description: "Map the cluster", id: "bg-2", kind: "subagent" },
				],
				type: "session.background",
			}),
		]);
		expect(rendered).toContain("2 background");
		expect(rendered).toContain("shell: pnpm ready");
		expect(rendered).toContain("subagent: Map the cluster");
	});

	it("draws state and background changes as dividers in the transcript too", () => {
		const items = deriveTranscript([
			row(0, { raw, state: "awaiting-input", type: "session.state" }),
			row(1, {
				raw,
				tasks: [{ description: "pnpm ready", id: "bg-1", kind: "shell" }],
				type: "session.background",
			}),
			row(2, { raw, tasks: [], type: "session.background" }),
			row(3, cached),
		]);
		expect(items.map((item) => item.kind)).toEqual([
			"telemetry",
			"telemetry",
			"telemetry",
			"telemetry",
		]);
		expect(items[0]).toMatchObject({ label: "state · awaiting input" });
		expect(items[1]).toMatchObject({
			label: "background · 1 · shell pnpm ready",
		});
		expect(items[2]).toMatchObject({ label: "background · nothing running" });
		expect(items[3]).toMatchObject({
			label:
				"usage · in 1410 · cache read 96240 · cache write 0 · out 210 · 99% cache · turn $0.0188 · total $0.0600",
		});
	});
});
