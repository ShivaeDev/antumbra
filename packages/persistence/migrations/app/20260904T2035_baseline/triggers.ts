import { rawSql } from '@prisma-next/sqlite/migration';

const SESSION_INPUT_INSERT_GUARD = `
CREATE TRIGGER "sessionInput_validate_insert"
BEFORE INSERT ON "sessionInput"
WHEN NEW."deliveryStatus" <> 'pending'
BEGIN
  SELECT RAISE(ABORT, 'new session input must be pending');
END`;

const SESSION_INPUT_UPDATE_GUARD = `
CREATE TRIGGER "sessionInput_validate_update"
BEFORE UPDATE ON "sessionInput"
WHEN NEW."id" <> OLD."id"
  OR NEW."sessionId" <> OLD."sessionId"
  OR NEW."requestDigest" <> OLD."requestDigest"
  OR NEW."deliveryStatus" NOT IN ('pending', 'accepted', 'ambiguous', 'queued_for_wake', 'refused')
BEGIN
  SELECT RAISE(ABORT, 'invalid session input update');
END`;

const SESSION_INPUT_PART_INSERT_GUARD = `
CREATE TRIGGER "sessionInputPart_validate_insert"
BEFORE INSERT ON "sessionInputPart"
WHEN NEW."position" < 0
  OR NEW."position" <> (SELECT COUNT(*) FROM "sessionInputPart" WHERE "inputId" = NEW."inputId")
  OR NOT (
    (NEW."kind" = 'text' AND NEW."text" IS NOT NULL AND length(trim(NEW."text")) > 0
      AND NEW."attachmentId" IS NULL AND NEW."displayName" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "sessionInputPart" WHERE "inputId" = NEW."inputId" AND "kind" = 'text'))
    OR
    (NEW."kind" = 'image' AND NEW."text" IS NULL AND NEW."attachmentId" IS NOT NULL
      AND NEW."displayName" IS NOT NULL AND length(trim(NEW."displayName")) > 0
      AND (SELECT COUNT(*) FROM "sessionInputPart" WHERE "inputId" = NEW."inputId" AND "kind" = 'image') < 4
      AND NOT EXISTS (SELECT 1 FROM "sessionInputPart" WHERE "inputId" = NEW."inputId" AND "kind" = 'text'))
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid session input part');
END`;

const SESSION_INPUT_PART_UPDATE_GUARD = `
CREATE TRIGGER "sessionInputPart_reject_update"
BEFORE UPDATE ON "sessionInputPart"
BEGIN
  SELECT RAISE(ABORT, 'session input parts are immutable');
END`;

const triggerPresence = (description: string, sql: string, name: string) => ({
  description,
  sql,
  params: ['trigger', name],
});

const guard = (name: string, table: string, sql: string) =>
  rawSql({
    id: `${table}.${name}`,
    label: `Install ${name}`,
    summary: `fail closed when ${table} durable invariants are violated; PSL cannot express a trigger`,
    operationClass: 'additive',
    target: {
      id: 'sqlite',
      details: { schema: 'main', objectType: 'trigger', name },
    },
    precheck: [
      triggerPresence(
        `ensure trigger "${name}" does not exist`,
        'SELECT COUNT(*) = 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
        name,
      ),
    ],
    execute: [{ description: `install ${name}`, sql }],
    postcheck: [
      triggerPresence(
        `verify trigger "${name}" exists`,
        'SELECT COUNT(*) > 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
        name,
      ),
    ],
  });

export const SESSION_INPUT_TRIGGERS = [
  guard('sessionInput_validate_insert', 'sessionInput', SESSION_INPUT_INSERT_GUARD),
  guard('sessionInput_validate_update', 'sessionInput', SESSION_INPUT_UPDATE_GUARD),
  guard('sessionInputPart_validate_insert', 'sessionInputPart', SESSION_INPUT_PART_INSERT_GUARD),
  guard('sessionInputPart_reject_update', 'sessionInputPart', SESSION_INPUT_PART_UPDATE_GUARD),
];
