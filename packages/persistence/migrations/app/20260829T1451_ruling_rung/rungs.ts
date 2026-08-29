// why: a ruling waits on one rung, and the rung is read off the asker's station
// the same way a new request reads it: a crew member's request waits on its
// voyage's captain, a captain's on the flagship, the flagship captain's on the
// admiral. An agent that answers to no voyage has no captain above it, so its
// request waits on the admiral. Rulings already ruled keep no rung — they wait
// on nobody — and neither does a proclamation, which has no asker to place.
export const PLACE_OPEN_RULINGS_ON_THEIR_RUNG = `UPDATE "ruling" SET "rung" = COALESCE((
  SELECT CASE
    WHEN "voyageAgent"."role" <> 'captain' THEN 'captain'
    WHEN EXISTS (
      SELECT 1 FROM "pieceAgent"
      WHERE "pieceAgent"."agentId" = "ruling"."requesterAgentId"
    ) THEN 'captain'
    WHEN "voyage"."kind" = 'flagship' THEN 'admiral'
    ELSE 'flagship'
  END
  FROM "voyageAgent"
  JOIN "voyage" ON "voyage"."id" = "voyageAgent"."voyageId"
  WHERE "voyageAgent"."agentId" = "ruling"."requesterAgentId"
  LIMIT 1
), 'admiral')
WHERE "ruledAt" IS NULL AND "requesterAgentId" IS NOT NULL`;
