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
