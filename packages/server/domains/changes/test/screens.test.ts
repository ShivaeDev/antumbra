import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { ChangeId } from "#ids.ts";
import { browse } from "#queries/browse.ts";
import { adoption, chartering, comment, inline, opening, pieceId, registration, repoId, request, review, seen } from "#test/kit.ts";

it.app("filters the Quay without losing its selected change or landed piece outcome", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	const id = ChangeId.make(adoption.requestId);
	const view = yield* answered(
		app.api.changes.browse({ query: "does not match", repositoryId: null, status: "all", selectedId: id }),
		"the browse view of all changes to render",
	);
	expect(view).toMatchObject({ rows: [], total: 1, selected: { id }, repositories: [{ id: repoId, name: "reef" }] });
	expect(
		(yield* answered(
			app.api.changes.browse({ query: "Reef", repositoryId: repoId, status: "alongside", selectedId: null }),
			"the browse view filtered to alongside changes to render",
		)).rows,
	).toHaveLength(1);
	yield* app.api.changes.observe({
		host: "github",
		observation: seen("landed", 3000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	expect((yield* answered(app.api.changes.byPiece({ pieceId }), "the piece's changes to be listed"))[0]).toMatchObject({
		id,
		stage: "landed",
		repoName: "reef",
	});
	expect(yield* answered(app.api.changes.quay({}), "the quay to be listed")).toMatchObject([{ id, group: "landed", stage: "landed" }]);
});

it.app("pushes a host observation into the live Quay and lists every registered repository", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	const live = yield* app.live(browse, { query: "", repositoryId: null, selectedId: null, status: "all" });
	yield* app.settle();
	const before = (yield* live.seen).length;

	yield* app.api.changes.observe({
		requestId: request("observe:landed"),
		host: "github",
		observation: seen("landed", 3000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	yield* app.settle();

	const views = yield* live.seen;
	expect(views.length).toBeGreaterThan(before);
	expect(views.at(-1)?.rows).toMatchObject([{ group: "landed", stage: "landed" }]);
	expect(views.at(-1)).toMatchObject({ total: 1, waiting: 0 });

	yield* app.api.repos.register({ requestId: request("repo:shoal"), defaultRef: "main", source: "https://github.com/example/shoal.git" });
	yield* app.settle();
	expect((yield* live.seen).at(-1)?.repositories).toMatchObject([{ name: "reef" }, { name: "shoal" }]);
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
	const situations = yield* answered(app.api.changes.sessionSituations({ sessionId }), "the session's situations to be listed");
	expect(situations.map((row) => row.situation)).toEqual(["merge_conflicts", "checks_failed", "unresolved_reviews"]);
	expect(situations[0]).toMatchObject({ reference: "#41" });
	expect(situations[0]?.text).toContain("reef");
	expect(situations[0]?.text).toContain("work/reef");
	yield* runner.append([{ ...source, cursor: 1, event: { type: "SessionEnded", ...logged, reason: "stopped" } }]);
	expect(yield* answered(app.api.changes.sessionSituations({ sessionId }), "the session's situations to be listed")).toEqual([]);
});

it.app("gathers what reviewers wrote into one situation that clears when the admiral forwards it", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	const changeId = ChangeId.make(adoption.requestId);
	const requestId = Id.Request.make("agent:feedback");
	const { agentId, sessionId } = identity(requestId);
	yield* app.api.agents.workNow({ requestId, pieceId });
	const runner = yield* connectRunner({ runnerId: "runner", logId: "feedback-runner", backends: ["claude"], imageInputBackends: [] });
	yield* runner.append([
		{
			at: 100,
			cursor: 0,
			event: {
				type: "SessionStarted",
				agentId,
				backend: "claude",
				cwd: "/reef",
				nativeRef: "native",
				requestId: "feedback:start",
				runnerId: "runner",
				sessionId,
				toolSetVersion: "v1",
			},
			logId: "feedback-runner",
		},
	]);
	const words = [
		review("r1", "The empty reef needs a test before this lands.", 1100),
		inline("c1", "This reads the first tide before one is recorded.", 1200),
		comment("i1", "Can this land today?", 1300),
	];
	yield* app.api.changes.observe({
		requestId: request("observe:words"),
		host: "github",
		observation: seen("open", 2000, words),
		attachment: { _tag: "Observed" },
		observedAt: new Date(3000).toISOString(),
	});
	const waiting = (yield* answered(app.api.changes.sessionSituations({ sessionId }), "the session's situations to be listed"))[0];
	expect(waiting).toMatchObject({ feedbackIds: ["r1", "c1", "i1"], label: "3 comments on #41", situation: "feedback_waiting" });
	expect(waiting?.text).toContain("Change #41 in reef has 3 new comments on branch work/reef, quoted below.");
	expect(waiting?.text).toContain("octocat reviewed\n> The empty reef needs a test before this lands.");
	expect(waiting?.text).toContain("octocat commented on src/reef.ts:42");
	expect(waiting?.text).toContain("octocat commented\n> Can this land today?");

	yield* app.api.changes.forwardFeedback({ requestId: request("forward"), changeId, ids: waiting?.feedbackIds ?? [] });
	expect(yield* answered(app.api.changes.sessionSituations({ sessionId }), "the session's situations to be listed")).toEqual([]);

	yield* app.api.changes.observe({
		requestId: request("observe:later"),
		host: "github",
		observation: seen("open", 5000, [...words, comment("i2", "One more thing before you push.", 5100)]),
		attachment: { _tag: "Observed" },
		observedAt: new Date(6000).toISOString(),
	});
	const returned = (yield* answered(app.api.changes.sessionSituations({ sessionId }), "the session's situations to be listed"))[0];
	expect(returned).toMatchObject({ feedbackIds: ["i2"], label: "1 comment on #41" });
	expect(returned?.text).toContain("has 1 new comment on branch work/reef");
});
