export const requireCompleteVerifiedStaging = () => `INSERT INTO "artifact" ("id", "title", "uri")
SELECT '__invalid_artifact_custody_staging__', 'invalid', 'invalid'
WHERE COALESCE((
  ((SELECT COUNT(*) FROM "artifact") = 0
    AND (SELECT COUNT(*) FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest' OR "key" LIKE 'migration:artifact-custody:item:%') = 0)
  OR (
  (SELECT COUNT(*) FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest') = 1
  AND (SELECT json_type("value", '$.predecessor') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest') IS 'text'
  AND (SELECT json_extract("value", '$.predecessor') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest') IS 'sha256:7bed1b5421dd224911e12335de498920dc5a617efc49f82a1f0f06cf52446bbe'
  AND (SELECT json_type("value", '$.count') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest') IS 'integer'
  AND (SELECT json_extract("value", '$.count') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest') IS (SELECT COUNT(*) FROM "artifact")
  AND (SELECT json_type("value", '$.snapshot') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest') IS 'text'
  AND length((SELECT json_extract("value", '$.snapshot') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest')) = 64
  AND (SELECT json_extract("value", '$.snapshot') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest') NOT GLOB '*[^0-9a-f]*'
  AND (SELECT COUNT(*) FROM "appMeta" WHERE "key" LIKE 'migration:artifact-custody:item:%') = (SELECT COUNT(*) FROM "artifact")
  AND NOT EXISTS (
    SELECT 1 FROM "artifact" a
    LEFT JOIN "appMeta" s ON s."key" = 'migration:artifact-custody:item:' || a."id"
    WHERE s."key" IS NULL
      OR json_type(s."value", '$.id') IS NOT 'text'
      OR json_extract(s."value", '$.id') IS NOT a."id"
      OR json_type(s."value", '$.legacyUri') IS NOT 'text'
      OR json_extract(s."value", '$.legacyUri') IS NOT a."uri"
      OR json_type(s."value", '$.snapshot') IS NOT 'text'
      OR json_extract(s."value", '$.snapshot') IS NOT (SELECT json_extract("value", '$.snapshot') FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest')
      OR json_type(s."value", '$.byteSize') IS NOT 'integer'
      OR json_extract(s."value", '$.byteSize') < 0
      OR json_extract(s."value", '$.byteSize') > 1048576
      OR json_type(s."value", '$.digest') IS NOT 'text'
      OR length(json_extract(s."value", '$.digest')) <> 64
      OR json_extract(s."value", '$.digest') GLOB '*[^0-9a-f]*'
      OR json_type(s."value", '$.basename') IS NOT 'text'
      OR json_extract(s."value", '$.basename') IN ('', '.', '..')
      OR instr(json_extract(s."value", '$.basename'), '/') <> 0
      OR instr(json_extract(s."value", '$.basename'), char(92)) <> 0
      OR instr(json_extract(s."value", '$.basename'), char(0)) <> 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM "appMeta" s
    LEFT JOIN "artifact" a ON s."key" = 'migration:artifact-custody:item:' || a."id"
    WHERE s."key" LIKE 'migration:artifact-custody:item:%' AND a."id" IS NULL
  )
)
), 0) = 0`;

export const backfillVerifiedMetadata = () => `UPDATE "artifact" SET
  "basename" = json_extract((SELECT "value" FROM "appMeta" WHERE "key" = 'migration:artifact-custody:item:' || "artifact"."id"), '$.basename'),
  "byteSize" = json_extract((SELECT "value" FROM "appMeta" WHERE "key" = 'migration:artifact-custody:item:' || "artifact"."id"), '$.byteSize'),
  "digest" = json_extract((SELECT "value" FROM "appMeta" WHERE "key" = 'migration:artifact-custody:item:' || "artifact"."id"), '$.digest')`;

export const consumeArtifactCustodyStaging = () =>
  `DELETE FROM "appMeta" WHERE "key" = 'migration:artifact-custody:manifest' OR "key" LIKE 'migration:artifact-custody:item:%'`;
