import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { ChangeId } from "#ids.ts";
import { adoption, chartering, opening, pieceId, registration, repoId, seen } from "#test/kit.ts";

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
	const requestId = Id.Request.make("agent:situation");
	const { agentId, sessionId } = identity(requestId);
	yield* app.api.agents.workNow({ requestId, pieceId });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "situation-runner", backends: ["claude"], imageInputBackends: [] });
	const logged = { sessionId, requestId: "situation:start" };
	const source = { logId: "situation-runner", at: 100 };
	yield* runner.append([
		{
			...source,
			cursor: 0,
			event: {
				type: "SessionStarted",
				...logged,
				agentId,
				backend: "claude",
				cwd: "/reef",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "v1",
			},
		},
	]);
	const situations = yield* answered(app.api.changes.sessionSituations({ sessionId }));
	expect(situations.map((row) => row.situation)).toEqual(["merge_conflicts", "checks_failed", "unresolved_reviews"]);
	expect(situations[0]).toMatchObject({ reference: "#41" });
	expect(situations[0]?.text).toContain("reef");
	expect(situations[0]?.text).toContain("work/reef");
	yield* runner.append([{ ...source, cursor: 1, event: { type: "SessionEnded", ...logged, reason: "stopped" } }]);
	expect(yield* answered(app.api.changes.sessionSituations({ sessionId }))).toEqual([]);
});
