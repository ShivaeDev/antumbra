#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.recreateTable({
        tableName: 'change',
        contractTable: {
          columns: [
            { name: 'activityAt', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'baseRef', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'body', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'checks', typeSql: 'TEXT', defaultSql: '', nullable: false },
            {
              name: 'createdAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
            { name: 'draftAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'externalId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'headRef', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'headSha', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'host', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'landedAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'mergeable', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'observedAt', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'openedByAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'raw', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'repoId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'review', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'stage', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'title', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'url', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'withdrawnAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [{ columns: ['host', 'repoId', 'externalId'] }],
          foreignKeys: [],
        },
        schemaColumnNames: [
          'activityAt',
          'baseRef',
          'body',
          'checks',
          'createdAt',
          'draftAt',
          'externalId',
          'headRef',
          'headSha',
          'host',
          'id',
          'landedAt',
          'mergeable',
          'observedAt',
          'openedByAgentId',
          'raw',
          'repoId',
          'review',
          'stage',
          'title',
          'url',
          'withdrawnAt',
        ],
        indexes: [
          { name: 'change_repoId_idx', columns: ['repoId'] },
          { name: 'change_host_externalId_idx', columns: ['host', 'externalId'] },
        ],
        summary:
          'Recreates table change to apply schema changes: database/change/unique:host,repoId,externalId',
        postchecks: [
          {
            description: 'verify unique constraint (host, repoId, externalId) on "change"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_index_list('change') l WHERE l.\"unique\" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 3 AND (SELECT COUNT(*) FROM pragma_index_info(l.name) WHERE name IN ('host', 'repoId', 'externalId')) = 3)",
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
