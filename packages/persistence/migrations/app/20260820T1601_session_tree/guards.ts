const SESSION_COLUMNS = `"id", "agentId", "backend", "cwd", "nativeRef", "status", "executionStatus", "charterDeliveredAt", "createdAt"`;

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

// why: an Agent holding several open Sessions is a state the fleet already
// knows how to heal — boot recovery keeps the Session the Agent points at, or
// the newest one when it points nowhere, and closes the rest. Refusing to
// migrate such a database would strand it on the old schema over a condition
// the product repairs on sight, so the migration performs that same repair and
// the index becomes law afterwards. The ordering below is boot recovery's:
// newest createdAt wins, ties broken by the larger id. Nothing is deleted —
// the stale rows close, and the adoption step that follows records them as
// unaudited, because nothing ever examined their completeness.
export const CLOSE_STALE_OPEN_ROOTS = `UPDATE "agentSession" SET "status" = 'closed'
WHERE "id" IN (
  SELECT stale."id"
  FROM "agentSession" stale
  WHERE stale."parentSessionId" IS NULL AND stale."status" = 'open'
    AND stale."id" <> COALESCE(
      (SELECT pointed."id"
       FROM "agent" holder
       JOIN "agentSession" pointed ON pointed."id" = holder."currentSessionId"
       WHERE holder."id" = stale."agentId"
         AND pointed."agentId" = stale."agentId"
         AND pointed."parentSessionId" IS NULL
         AND pointed."status" = 'open'),
      (SELECT newest."id"
       FROM "agentSession" newest
       WHERE newest."agentId" = stale."agentId"
         AND newest."parentSessionId" IS NULL
         AND newest."status" = 'open'
       ORDER BY newest."createdAt" DESC, newest."id" DESC
       LIMIT 1))
)`;

// why: the filter already pins status to 'open', so uniqueness over
// ("agentId", "status") is uniqueness over "agentId" among open roots. The
// column tuple is what identifies an index to the schema differ, and
// ("agentId") alone is already taken by agentSession_agentId_idx.
export const ONE_OPEN_ROOT_PER_AGENT = `CREATE UNIQUE INDEX "agentSession_one_open_root_per_agent"
ON "agentSession" ("agentId", "status")
WHERE "parentSessionId" IS NULL AND "status" = 'open'`;
