#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'boardEntryReceipt',
        columns: [
          col('entryId', 'TEXT', { notNull: true }),
          col('readAt', 'TEXT', { notNull: true, default: fn('now()') }),
        ],
        constraints: [primaryKey(['entryId'])],
      }),
      this.addColumn({
        table: 'boardEntry',
        column: { name: 'kind', typeSql: 'TEXT', defaultSql: "DEFAULT 'note'", nullable: false },
      }),
      this.addColumn({
        table: 'boardEntry',
        column: {
          name: 'precedence',
          typeSql: 'TEXT',
          defaultSql: "DEFAULT 'routine'",
          nullable: false,
        },
      }),
      this.addColumn({
        table: 'boardEntry',
        column: { name: 'sourceRef', typeSql: 'TEXT', defaultSql: '', nullable: true },
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
            { name: 'kind', typeSql: 'TEXT', defaultSql: "DEFAULT 'note'", nullable: false },
            {
              name: 'precedence',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT 'routine'",
              nullable: false,
            },
            { name: 'register', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'seq', typeSql: 'INTEGER', defaultSql: '', nullable: false },
            { name: 'sourceRef', typeSql: 'TEXT', defaultSql: '', nullable: true },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [{ columns: ['boardId', 'seq'] }, { columns: ['boardId', 'sourceRef'] }],
          foreignKeys: [],
        },
        schemaColumnNames: [
          'authorAgentId',
          'boardId',
          'body',
          'createdAt',
          'id',
          'register',
          'seq',
        ],
        indexes: [{ name: 'boardEntry_boardId_idx', columns: ['boardId'] }],
        summary:
          'Recreates table boardEntry to apply schema changes: database/boardEntry/unique:boardId,sourceRef',
        postchecks: [
          {
            description: 'verify unique constraint (boardId, seq) on "boardEntry"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_index_list('boardEntry') l WHERE l.\"unique\" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 2 AND (SELECT COUNT(*) FROM pragma_index_info(l.name) WHERE name IN ('boardId', 'seq')) = 2)",
          },
          {
            description: 'verify unique constraint (boardId, sourceRef) on "boardEntry"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_index_list('boardEntry') l WHERE l.\"unique\" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 2 AND (SELECT COUNT(*) FROM pragma_index_info(l.name) WHERE name IN ('boardId', 'sourceRef')) = 2)",
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
