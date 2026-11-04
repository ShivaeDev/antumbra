import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { expect } from "vitest";
import { chartering, opening, pieceId, registration, repoId, request, seen } from "#test/kit.ts";

postgresApp.it("keeps adoption requests actionable and retries the same frozen proposal", [], function* ({ api, journal, replayJournal }) {
	const legacy = yield* journal();
	yield* legacy.api.voyages.open(opening);
	yield* legacy.api.pieces.charter(chartering);
	yield* legacy.api.repos.register(registration);
	const { agentId, sessionId } = yield* legacy.artifact.prepare("proposal-author");
	yield* replayJournal(legacy);
	const prep = {
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
		requestId: request("prepared"),
	};
	yield* api["changes.prepare"](prep);
	const changeId = ChangeId.make("prepared");
	const proposal = {
		changeId,
		title: "Frozen title",
		body: "Frozen body",
		base: null,
		draft: false,
		at: new Date(2000).toISOString(),
		requestId: request("publish"),
	};
	yield* api["changes.freeze"](proposal);
	yield* api["changes.failPublication"]({
		changeId,
		attemptId: proposal.requestId,
		message: "login required",
		requestId: request("publication-failed"),
	});
	expect(yield* api["changes.publishing"]({})).toEqual([]);
	yield* api["changes.freeze"]({ ...proposal, title: "Later", body: "Later", requestId: request("retry-publish") });
	expect(yield* api["changes.publishing"]({})).toMatchObject([{ title: "Frozen title", body: "Frozen body", publicationError: null }]);
	const asking = { pieceId, repoId, url: seen("open").url, requestId: request("adoption-request") };
	yield* api["changes.requestAdoption"](asking);
	yield* api["changes.failAdoption"]({ id: asking.requestId, url: asking.url, message: "not found", requestId: request("adoption-failed") });
	expect(yield* api["changes.adoptions"]({})).toMatchObject([{ error: "not found" }]);
	yield* api["changes.retryAdoption"]({ id: asking.requestId, url: asking.url, requestId: request("retry-adoption") });
	expect(yield* api["changes.adoptions"]({})).toMatchObject([{ error: null }]);
	yield* api["changes.observeHostCapability"]({ host: "github", available: false, detail: "login required", requestId: request("capability") });
	expect((yield* api["changes.hostCapabilities"]({})).find((row) => row.host === "github")).toEqual({
		host: "github",
		available: false,
		detail: "login required",
	});
	yield* api["changes.refresh"]({ requestId: request("refresh") });
	expect((yield* api["changes.world"]({})).changes).toHaveLength(1);
});
