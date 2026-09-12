import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import type { LogEvent } from "@antumbra/platform-runner/log.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { transcriptFindings } from "@antumbra/runner-backends-claude/subsession-audit.ts";
import { censusOf, censusUnreadable } from "@antumbra/runner-backends-codex/thread-census.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { SessionId } from "#ids.ts";

const sessionId = SessionId.make("root");
const raw = { source: "provider", kind: "record", payload: "{}" };
const opened = (subsessionRef: string, parentRef = "native-root"): AgentEvent => ({
	type: "subsession.opened",
	subsessionRef,
	parentRef,
	spawnedBy: subsessionRef,
	raw,
});
const provider = (event: AgentEvent, observation: "live" | "audit" = "live"): LogEvent => ({ type: "ProviderEvent", sessionId, observation, event });
const connect = (backend = "codex") =>
	Effect.gen(function* () {
		const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: [backend], imageInputBackends: [] });
		let cursor = 0;
		const append = (events: readonly LogEvent[]) => runner.append(events.map((event) => ({ logId: "log", at: 100, cursor: cursor++, event })));
		yield* append([
			{
				type: "SessionStarted",
				sessionId,
				requestId: "start",
				agentId: "agent",
				backend,
				cwd: "/berth",
				nativeRef: "native-root",
				runnerId: "runner",
				toolSetVersion: "tools",
			},
		]);
		return append;
	});

it.app("a census admits the missing nested child once and preserves its parent and gap", function* (app) {
	const append = yield* connect();
	yield* append([provider(opened("branch"))]);
	const sweep = [
		{ threadId: "branch", parentThreadId: "native-root", agentNickname: undefined, agentPath: undefined, agentRole: undefined, working: false },
		{ threadId: "leaf", parentThreadId: "branch", agentNickname: "quiet-tern", agentPath: "agents/purser.md", agentRole: "purser", working: false },
	];
	const census = censusOf((node) => node === "branch", sweep);
	yield* append([...census.events.map((event) => provider(event, "audit")), { type: "SessionCensus", sessionId, nodes: census.nodes }]);
	const tree = yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }));
	expect(tree).toHaveLength(3);
	const branch = tree.find((node) => node.nativeRef === "branch");
	const leaf = tree.find((node) => node.nativeRef === "leaf");
	if (branch === undefined || leaf === undefined) return yield* Effect.die("census nodes missing");
	expect(leaf).toMatchObject({
		parentSessionId: branch.id,
		label: "quiet-tern",
		kind: "agents/purser.md",
		completeness: "incomplete",
		executionStatus: "idle",
		attached: false,
	});
	expect(yield* app.rows.sessionGap.where({ sessionId: leaf.id })).toMatchObject([
		{ kind: "census-missing", detail: expect.stringContaining("the stream never carried it") },
	]);
	expect(yield* app.rows.sessionGap.where({ sessionId: branch.id })).toEqual([]);
	const repeated = censusOf(() => true, sweep);
	yield* append([...repeated.events.map((event) => provider(event, "audit")), { type: "SessionCensus", sessionId, nodes: repeated.nodes }]);
	expect(yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }))).toHaveLength(3);
	expect(yield* app.rows.sessionGap.where({ sessionId: leaf.id })).toHaveLength(1);
});

it.app("an unreadable census records uncertainty without inventing a child", function* (app) {
	const append = yield* connect();
	const census = censusUnreadable("native-root", "provider unavailable");
	yield* append([...census.events.map((event) => provider(event, "audit")), { type: "SessionCensus", sessionId, nodes: census.nodes }]);
	expect(yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }))).toHaveLength(1);
	const rootGaps = yield* app.rows.sessionGap.where({ sessionId });
	expect(rootGaps).toMatchObject([{ kind: "unknown", detail: expect.stringContaining("could not be checked") }]);
});

it.app("node audit completion preserves a missing transcript line and does not restart closed work", function* (app) {
	const append = yield* connect("claude");
	yield* append([
		provider(opened("complete")),
		provider(opened("gapped")),
		provider({ type: "subsession.ended", subsessionRef: "complete", outcome: "completed", raw }),
		provider({ type: "subsession.ended", subsessionRef: "gapped", outcome: "completed", raw }),
		provider({ type: "turn.completed", status: "completed", raw }),
	]);
	const stored = [
		{
			uuid: "unseen",
			session_id: "native-root",
			type: "assistant" as const,
			parent_agent_id: null,
			parent_tool_use_id: "gapped",
			message: { role: "assistant", content: [{ type: "text", text: "one more thing", citations: null }] },
		},
	];
	const findings = transcriptFindings("gapped", stored, []);
	yield* append([
		...findings.map((event) =>
			provider(event.type === "subsession.gap" ? { ...event, origin: { node: "gapped", spawnedBy: "gapped" } } : event, "audit"),
		),
		provider({ type: "message", role: "agent", text: "one more thing", origin: { node: "gapped", spawnedBy: "gapped" }, raw }, "audit"),
		{ type: "SessionNodeAudited", sessionId, nodeRef: "complete" },
		{ type: "SessionNodeAudited", sessionId, nodeRef: "gapped" },
	]);
	const tree = yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }));
	expect(tree.find((node) => node.nativeRef === "complete")).toMatchObject({ completeness: "complete", status: "closed", outcome: "completed" });
	const gapped = tree.find((node) => node.nativeRef === "gapped");
	if (gapped === undefined) return yield* Effect.die("audited node missing");
	expect(gapped).toMatchObject({ completeness: "incomplete", status: "closed", outcome: "completed", executionStatus: "idle", attached: false });
	expect(yield* app.rows.sessionGap.where({ sessionId: gapped.id })).toMatchObject([
		{ detail: "1 of 1 transcript lines the provider stored for this node never reached the record" },
	]);
	expect(yield* app.rows.sessionEvent.where({ sessionId: gapped.id })).toHaveLength(2);
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ nativeRef: "native-root", executionStatus: "idle" });
});

it.app("a late announcement reparents an already recorded child without moving its words to the root", function* (app) {
	const append = yield* connect();
	yield* append([
		provider({ type: "message", role: "agent", text: "reading the ledger", origin: { node: "leaf", spawnedBy: "leaf-call" }, raw }),
		provider(opened("branch")),
		provider({ type: "subsession.opened", subsessionRef: "leaf", spawnedBy: "leaf-call", parentRef: "branch", kind: "auditor", raw }),
		provider({ type: "subsession.ended", subsessionRef: "leaf", outcome: "interrupted", raw }),
	]);
	const tree = yield* answered(app.api.sessions.tree({ rootSessionId: sessionId }));
	const branch = tree.find((node) => node.nativeRef === "branch");
	const leaf = tree.find((node) => node.nativeRef === "leaf");
	if (branch === undefined || leaf === undefined) return yield* Effect.die("delegated nodes missing");
	expect(tree).toHaveLength(3);
	expect(leaf).toMatchObject({ parentSessionId: branch.id, kind: "auditor", completeness: "incomplete", status: "closed", outcome: "interrupted" });
	expect(yield* app.rows.sessionGap.where({ sessionId: leaf.id })).toMatchObject([{ kind: "adopted-late" }]);
	expect(yield* app.rows.sessionEvent.where({ sessionId: leaf.id })).toMatchObject([{ cursor: 1 }]);
	expect((yield* app.rows.sessionEvent.where({ sessionId })).map((event) => event.cursor)).toEqual([2, 3, 4]);
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ nativeRef: "native-root" });
});
