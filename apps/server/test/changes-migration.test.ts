import { ChangeId } from "@antumbra/domain-changes/ids.ts";
import { type ChangeRow, change } from "@antumbra/domain-changes/rows/change.ts";
import type { ChangeFeedbackRow } from "@antumbra/domain-changes/rows/change-feedback.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { app, registryOf } from "@antumbra/server-journal/app.ts";
import { Database } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { start } from "@antumbra/server-journal/startup.ts";
import { it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { expect } from "vitest";
import { features } from "#features.ts";
import { projections } from "#projections.ts";

const JOURNAL = `CREATE TABLE "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL, "subject" TEXT)`;

const AT = "2026-09-13T09:00:00.000Z";

const changeRow = (id: string, externalId: string): ChangeRow => ({
	id: ChangeId.make(id),
	repoId: RepoId.make("repo-reef"),
	host: "github",
	title: "The tide is read before it is recorded",
	body: "",
	headRef: "work/reef",
	baseRef: "main",
	headSha: "sha-reef",
	preparedHeadRef: null,
	preparedHeadSha: null,
	publicationRequestId: null,
	publicationError: null,
	proposalFrozenAt: null,
	worktreePath: null,
	workingDiff: null,
	workingTreeStatus: null,
	submissionKey: null,
	stage: "open",
	draftAt: null,
	url: `https://github.com/example/reef/pull/${externalId}`,
	externalId,
	checks: "green",
	review: "none",
	mergeable: "clean",
	openedByAgentId: null,
	originSessionId: null,
	raw: null,
	activityAt: AT,
	observedAt: AT,
	landedAt: null,
	withdrawnAt: null,
	archivedAt: null,
	createdAt: AT,
});

const feedbackRow = (id: string, changeId: string): ChangeFeedbackRow => ({
	id,
	changeId: ChangeId.make(changeId),
	kind: "comment",
	author: "octocat",
	verdict: null,
	path: null,
	line: null,
	body: "This reads the first tide before any has been recorded.",
	url: `https://github.com/example/reef/pull/41#issuecomment-${id}`,
	at: AT,
	forwardedAt: null,
});

const encodeChange = Schema.encodeUnknownSync(change.Row);

const seeded = (...facts: readonly { readonly name: string; readonly payload: Record<string, unknown> }[]) =>
	Effect.gen(function* () {
		const { write: sql } = yield* Database;
		yield* sql.unsafe(JOURNAL);
		const entries: Record<string, unknown>[] = [];
		for (const fact of facts) {
			const seq = entries.length + 1;
			entries.push({ at: 100 + seq, name: fact.name, payload: JSON.stringify(fact.payload), requestId: `request-${seq}`, seq });
		}
		yield* sql`INSERT INTO "journal" ${sql.insert(entries)}`;
	}).pipe(Effect.orDie);

const booted = Effect.gen(function* () {
	const database = yield* Database;
	yield* start(database.write, yield* registryOf(app(features, projections)));
});

it.effect("a journal written before changes carried feedback boots, migrates once, and keeps the feedback it already held", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* seeded(
			{
				name: "RepoRegistered",
				payload: { id: "repo-reef", name: "reef", source: "https://github.com/example/reef.git", defaultRef: "main", createdAt: AT },
			},
			{ name: "ChangeObserved", payload: { change: encodeChange(changeRow("change-older", "41")), transition: null } },
			{
				name: "ChangeObserved",
				payload: {
					change: encodeChange(changeRow("change-newer", "42")),
					transition: null,
					feedback: [feedbackRow("IC_kept", "change-newer")],
				},
			},
		);
		yield* booted;
		expect(yield* database.read`SELECT "id", "review" FROM "change" ORDER BY "id"`).toEqual([
			{ id: "change-newer", review: "none" },
			{ id: "change-older", review: "none" },
		]);
		expect(yield* database.read`SELECT "id", "changeId" FROM "changeFeedback"`).toEqual([{ id: "IC_kept", changeId: "change-newer" }]);
		expect(yield* database.read`SELECT "feature", "number" FROM "fact_migration"`).toContainEqual({ feature: "changes", number: 1 });
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);
