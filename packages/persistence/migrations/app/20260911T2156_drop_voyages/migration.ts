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
        tableName: 'rulingSubject',
        contractTable: {
          columns: [
            { name: 'agentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'kind', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'repoId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'rulingId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'tag', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'voyageId', typeSql: 'TEXT', defaultSql: '', nullable: true },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [],
          foreignKeys: [
            {
              columns: ['rulingId'],
              references: { table: 'ruling', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
            {
              columns: ['repoId'],
              references: { table: 'repo', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
            {
              columns: ['pieceId'],
              references: { table: 'piece', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
            {
              columns: ['agentId'],
              references: { table: 'agent', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: [
          'agentId',
          'id',
          'kind',
          'pieceId',
          'repoId',
          'rulingId',
          'tag',
          'voyageId',
        ],
        indexes: [
          { name: 'rulingSubject_tag_idx', columns: ['tag'] },
          { name: 'rulingSubject_rulingId_idx', columns: ['rulingId'] },
          { name: 'rulingSubject_repoId_idx', columns: ['repoId'] },
          { name: 'rulingSubject_pieceId_idx', columns: ['pieceId'] },
          { name: 'rulingSubject_agentId_idx', columns: ['agentId'] },
        ],
        summary:
          'Recreates table rulingSubject to apply schema changes: database/rulingSubject/foreign-key:voyageId->.voyage(id)',
        postchecks: [
          {
            description: 'verify foreign key (voyageId) → voyage(id) is gone from "rulingSubject"',
            sql: "SELECT COUNT(*) = 0 AS \"result\" FROM pragma_foreign_key_list('rulingSubject') WHERE \"table\" = 'voyage'",
          },
          {
            description: 'verify foreign key (rulingId) → ruling(id) on "rulingSubject"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingSubject') f WHERE f.\"table\" = 'ruling' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('rulingId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
          {
            description: 'verify foreign key (repoId) → repo(id) on "rulingSubject"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingSubject') f WHERE f.\"table\" = 'repo' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('repoId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
          {
            description: 'verify foreign key (pieceId) → piece(id) on "rulingSubject"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingSubject') f WHERE f.\"table\" = 'piece' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('pieceId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
          {
            description: 'verify foreign key (agentId) → agent(id) on "rulingSubject"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingSubject') f WHERE f.\"table\" = 'agent' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('agentId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
      this.dropIndex({ table: 'rulingSubject', index: 'rulingSubject_voyageId_idx' }),
      this.dropTable({ table: 'voyage' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
