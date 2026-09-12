import { answered, it } from "@antumbra/app-testing/entry.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { expect } from "vitest";
import { ChangeId } from "#ids.ts";
import { chartering, opening, pieceId, registration, repoId, request, seen } from "#test/kit.ts";

const asking = { requestId: request("agent:reef"), role: "hand", backend: "claude", model: null, effort: null } as const;
const { agentId, sessionId } = identity(asking.requestId);
const preparation = {
	requestId: request("prepared:reef"),
	agentId,
	sessionId,
	pieceId,
	repoId,
	host: "github",
	branch: "work/reef",
	headSha: "sha-1",
	workingDiff: "",
	workingTreeStatus: "",
	worktreePath: "/reef",
	capturedAt: new Date(1000).toISOString(),
};

it.app("attaches host evidence only to the exact prepared branch and head", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.agents.spawn(asking);
	yield* app.api.changes.prepare(preparation);
	yield* app.api.changes.observe({
		requestId: request("observe:wrong-head"),
		host: "github",
		observation: { ...seen("open", 2000), headSha: "other-head" },
		attachment: { _tag: "Observed" },
		observedAt: new Date(3000).toISOString(),
	});
	expect((yield* answered(app.api.changes.all({})))[0]?.stage).toBe("prepared");
	yield* app.api.changes.observe({
		requestId: request("observe:exact"),
		host: "github",
		observation: seen("open", 2000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(3000).toISOString(),
	});
	expect((yield* answered(app.api.changes.all({})))[0]).toMatchObject({ id: preparation.requestId, stage: "open", externalId: "41" });
	expect(yield* app.rows.change.count({})).toBe(1);
});

it.app("keeps a publication failure actionable and retries the same frozen proposal", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.agents.spawn(asking);
	yield* app.api.changes.prepare(preparation);
	const changeId = ChangeId.make(preparation.requestId);
	const proposal = {
		requestId: request("publish:first"),
		changeId,
		title: "Frozen title",
		body: "Frozen body",
		base: null,
		draft: false,
		at: new Date(2000).toISOString(),
	};
	yield* app.api.changes.freeze(proposal);
	yield* app.api.changes.failPublication({
		requestId: request("publication:failure"),
		changeId,
		attemptId: proposal.requestId,
		message: "GitHub login required",
	});
	expect(yield* answered(app.api.changes.publishing({}))).toEqual([]);
	expect((yield* answered(app.api.changes.quay({})))[0]?.publicationError).toBe("GitHub login required");
	yield* app.api.changes.freeze({ ...proposal, requestId: request("publish:retry"), title: "Later title", body: "Later body" });
	expect((yield* answered(app.api.changes.publishing({})))[0]).toMatchObject({
		title: "Frozen title",
		body: "Frozen body",
		publicationError: null,
		preparedHeadSha: "sha-1",
	});
	yield* app.api.changes.failPublication({
		requestId: request("publication:old-failure"),
		changeId,
		attemptId: proposal.requestId,
		message: "Old attempt failed",
	});
	expect((yield* answered(app.api.changes.publishing({})))[0]?.publicationError).toBeNull();
});

it.app("shows an adoption refusal and allows correcting its URL without losing the request", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.requestAdoption({ requestId: request("adoption:request"), pieceId, repoId, url: "https://github.com/example/reef/pull/0" });
	yield* app.api.changes.failAdoption({
		requestId: request("adoption:failed"),
		id: "adoption:request",
		url: "https://github.com/example/reef/pull/0",
		message: "Pull request not found",
	});
	expect((yield* answered(app.api.changes.adoptions({})))[0]?.error).toBe("Pull request not found");
	yield* app.api.changes.retryAdoption({ requestId: request("adoption:retry"), id: "adoption:request", url: seen("open").url });
	expect((yield* answered(app.api.changes.adoptions({})))[0]).toMatchObject({ id: "adoption:request", url: seen("open").url, error: null });
});
