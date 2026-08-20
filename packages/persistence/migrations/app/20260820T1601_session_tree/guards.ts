const SESSION_COLUMNS = `"id", "agentId", "backend", "cwd", "nativeRef", "status", "executionStatus", "charterDeliveredAt", "createdAt"`;

// why: this guard runs after the recreate, so it re-selects the grown column
// set and trips the primary key exactly like the guards before it.
const ROOTED_SESSION_COLUMNS = `${SESSION_COLUMNS}, "outcome", "completeness", "label", "kind", "parentSessionId", "rootSessionId"`;

// why: completeness is read off status, so an unknown status would be recorded
// as unaudited truth nobody ever audited. Refuse the migration instead.
export const REJECT_INVALID_SESSION_STATUS = `INSERT INTO "agentSession" (${SESSION_COLUMNS})
SELECT ${SESSION_COLUMNS}
FROM "agentSession" WHERE "status" NOT IN ('open', 'closed')`;

// why: every surviving Session predates subsessions, so each one is its own
// root with no parent. An open Session is still recording; a closed one
// finished before gap tracking existed, so its completeness was never examined
// and calling it complete would invent evidence.
export const ADOPT_EXISTING_SESSIONS_AS_ROOTS = `UPDATE "agentSession" SET
  "rootSessionId" = "id",
  "parentSessionId" = NULL,
  "completeness" = CASE "status" WHEN 'open' THEN 'recording' ELSE 'unaudited' END`;

// why: an event whose Session vanished is evidence of a lost write path, not a
// row to adopt under a new foreign key.
export const REJECT_ORPHAN_SESSION_EVENTS = `INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload", "at")
SELECT e."sessionId", e."seq", e."kind", e."payload", e."at"
FROM "sessionEvent" e
WHERE NOT EXISTS (SELECT 1 FROM "agentSession" s WHERE s."id" = e."sessionId")`;

// why: the partial unique index makes one open root per Agent law. Prove the
// surviving rows already honour it rather than failing inside the index.
export const REJECT_SECOND_OPEN_ROOT = `INSERT INTO "agentSession" (${ROOTED_SESSION_COLUMNS})
SELECT ${ROOTED_SESSION_COLUMNS}
FROM "agentSession"
WHERE "agentId" IN (
  SELECT "agentId" FROM "agentSession"
  WHERE "parentSessionId" IS NULL AND "status" = 'open'
  GROUP BY "agentId" HAVING COUNT(*) > 1
)`;

// why: the filter already pins status to 'open', so uniqueness over
// ("agentId", "status") is uniqueness over "agentId" among open roots. The
// column tuple is what identifies an index to the schema differ, and
// ("agentId") alone is already taken by agentSession_agentId_idx.
export const ONE_OPEN_ROOT_PER_AGENT = `CREATE UNIQUE INDEX "agentSession_one_open_root_per_agent"
ON "agentSession" ("agentId", "status")
WHERE "parentSessionId" IS NULL AND "status" = 'open'`;
