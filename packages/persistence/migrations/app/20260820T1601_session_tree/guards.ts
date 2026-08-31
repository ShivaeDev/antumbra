export const ADOPT_EXISTING_SESSIONS_AS_ROOTS = `UPDATE "agentSession" SET
  "rootSessionId" = "id",
  "parentSessionId" = NULL,
  "completeness" = CASE "status" WHEN 'open' THEN 'recording' ELSE 'unaudited' END`;

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

export const ONE_OPEN_ROOT_PER_AGENT = `CREATE UNIQUE INDEX "agentSession_one_open_root_per_agent"
ON "agentSession" ("agentId", "status")
WHERE "parentSessionId" IS NULL AND "status" = 'open'`;
