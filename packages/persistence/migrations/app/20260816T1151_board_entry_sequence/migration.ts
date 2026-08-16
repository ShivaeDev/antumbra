#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, dataTransform } from '@prisma-next/sqlite/migration';

// why: SQLite cannot add a NOT NULL column without a default, and the tightened
// table rejects a null sequence, so the column arrives with a throwaway default,
// existing rows are ranked per board by (createdAt, id), and the recreate drops
// the default again — every later append allocates its own place.
const SEQ_BACKFILL = `UPDATE "boardEntry" SET "seq" = (
  SELECT COUNT(*) FROM "boardEntry" AS "earlier"
  WHERE "earlier"."boardId" = "boardEntry"."boardId"
    AND ("earlier"."createdAt" < "boardEntry"."createdAt"
      OR ("earlier"."createdAt" = "boardEntry"."createdAt"
        AND "earlier"."id" <= "boardEntry"."id"))
)`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        table: 'boardEntry',
        column: { name: 'seq', typeSql: 'INTEGER', defaultSql: 'DEFAULT 0', nullable: false },
      }),
      dataTransform({
        id: 'boardEntry.seq.backfill',
        label: 'Rank existing board entries per board',
        table: 'boardEntry',
        description: 'number existing boardEntry rows per board by (createdAt, id)',
        run: () => SEQ_BACKFILL,
      }),
      this.recreateTable({
        tableName: 'boardEntry',
        contractTable: {
          columns: [
            { name: 'authorAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'boardId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'body', typeSql: 'TEXT', defaultSql: '', nullable: false },
            {
              name: 'createdAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'register', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'seq', typeSql: 'INTEGER', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [{ columns: ['boardId', 'seq'] }],
          foreignKeys: [],
        },
        schemaColumnNames: ['authorAgentId', 'boardId', 'body', 'createdAt', 'id', 'register', 'seq'],
        indexes: [{ name: 'boardEntry_boardId_idx', columns: ['boardId'] }],
        summary:
          'Recreates table boardEntry to apply schema changes: database/boardEntry/unique:boardId,seq',
        postchecks: [
          {
            description: 'verify unique constraint (boardId, seq) on "boardEntry"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_index_list('boardEntry') l WHERE l.\"unique\" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 2 AND (SELECT COUNT(*) FROM pragma_index_info(l.name) WHERE name IN ('boardId', 'seq')) = 2)",
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
