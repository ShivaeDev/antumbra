#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, dataTransform, primaryKey, unique } from '@prisma-next/sqlite/migration';

const TRANSFER_OWNERS = `INSERT INTO "boardOwner" ("boardId", "ownerKind", "ownerId")
SELECT "boardId", 'agent', "agentId" FROM "agentBoard"
UNION ALL
SELECT "boardId", 'piece', "pieceId" FROM "pieceBoard"
UNION ALL
SELECT "boardId", 'voyage', "voyageId" FROM "voyageBoard"`;

const REJECT_DANGLING_OWNERS = `INSERT INTO "boardOwner" ("boardId", "ownerKind", "ownerId")
SELECT "boardId", "ownerKind", "ownerId" FROM "boardOwner"
WHERE ("ownerKind" = 'agent' AND NOT EXISTS (
  SELECT 1 FROM "agent" WHERE "agent"."id" = "boardOwner"."ownerId"
)) OR ("ownerKind" = 'piece' AND NOT EXISTS (
  SELECT 1 FROM "piece" WHERE "piece"."id" = "boardOwner"."ownerId"
)) OR ("ownerKind" = 'voyage' AND NOT EXISTS (
  SELECT 1 FROM "voyage" WHERE "voyage"."id" = "boardOwner"."ownerId"
))`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'boardOwner',
        columns: [
          col('boardId', 'TEXT', { notNull: true }),
          col('ownerId', 'TEXT', { notNull: true }),
          col('ownerKind', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['boardId']), unique(['ownerKind', 'ownerId'])],
      }),
      dataTransform({
        id: 'boardOwner.transfer',
        label: 'Transfer typed Board owners',
        table: 'boardOwner',
        description: 'move legacy Board links into their globally exclusive typed owner table',
        run: () => TRANSFER_OWNERS,
      }),
      dataTransform({
        id: 'boardOwner.owner.guard',
        label: 'Reject dangling Board owners',
        table: 'boardOwner',
        description: 'fail when a Board link names an owner that does not exist',
        run: () => REJECT_DANGLING_OWNERS,
      }),
      this.dropTable({ table: 'agentBoard' }),
      this.dropTable({ table: 'pieceBoard' }),
      this.dropTable({ table: 'voyageBoard' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
