import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { expect } from "vitest";
import { ChangeId } from "#ids.ts";
import { adoption, chartering, opening, pieceId, registration, repoId, request, seen, voyageId } from "#test/kit.ts";

it.app("filters the Quay without losing its selected change or landed piece outcome", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	const id = ChangeId.make(adoption.requestId);
	const view = yield* answered(app.api.changes.browse({ query: "does not match", repositoryId: null, status: "all", selectedId: id }));
	expect(view).toMatchObject({ rows: [], total: 1, selected: { id }, repositories: [{ id: repoId, name: "reef" }] });
	expect((yield* answered(app.api.changes.browse({ query: "Reef", repositoryId: repoId, status: "alongside", selectedId: null }))).rows).toHaveLength(
		1,
	);
	yield* app.api.changes.observe({
		host: "github",
		observation: seen("landed", 3000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	expect((yield* answered(app.api.changes.byPiece({ pieceId })))[0]).toMatchObject({ id, stage: "landed", repoName: "reef" });
	expect(yield* answered(app.api.changes.quay({}))).toEqual([]);
});

it.app("shows situations only while the assigned session and external change are open", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt({ ...adoption, observation: { ...seen("open"), checks: "red", mergeable: "conflict", review: "changes_requested" } });
	const sessionId = SessionId.make("session:situation");
	const agentId = AgentId.make("agent:situation");
	yield* app.api.starts.request({
		agentId,
		sessionId,
		pieceId,
		voyageId,
		backend: "claude",
		model: null,
		effort: null,
		role: "hand",
		charter: "Sound the reef",
		toolSetVersion: "v1",
	});
	const commit = yield* Commit;
	const identity = { sessionId, nodeRef: null, origin: null, operationId: null };
	const source = { logId: "situation-runner", at: 100, requestId: request("situation:start") };
	yield* commit.observe(observed, {
		...source,
		cursor: 0,
		payload: {
			...identity,
			evidence: { type: "started", agentId, backend: "claude", cwd: "/reef", nativeRef: "native", runnerId: "runner", toolSetVersion: "v1" },
		},
	});
	const situations = yield* answered(app.api.changes.sessionSituations({ sessionId }));
	expect(situations.map((row) => row.situation)).toEqual(["merge_conflicts", "checks_failed", "unresolved_reviews"]);
	expect(situations[0]).toMatchObject({ reference: "#41" });
	expect(situations[0]?.text).toContain("reef");
	expect(situations[0]?.text).toContain("work/reef");
	yield* commit.observe(observed, { ...source, cursor: 1, payload: { ...identity, evidence: { type: "ended", reason: "stopped" } } });
	expect(yield* answered(app.api.changes.sessionSituations({ sessionId }))).toEqual([]);
});
