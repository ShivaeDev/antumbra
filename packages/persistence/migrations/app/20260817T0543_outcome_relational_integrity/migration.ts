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
      this.createIndex({
        table: 'pieceArtifact',
        index: 'pieceArtifact_artifactId_idx',
        columns: ['artifactId'],
      }),
      this.createIndex({
        table: 'pieceArtifact',
        index: 'pieceArtifact_pieceId_idx',
        columns: ['pieceId'],
      }),
      this.createIndex({
        table: 'pieceReport',
        index: 'pieceReport_pieceId_idx',
        columns: ['pieceId'],
      }),
      this.createIndex({
        table: 'pieceReport',
        index: 'pieceReport_reportId_idx',
        columns: ['reportId'],
      }),
      this.recreateTable({
        tableName: 'pieceArtifact',
        contractTable: {
          columns: [
            { name: 'artifactId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['pieceId', 'artifactId'] },
          uniques: [],
          foreignKeys: [
            {
              columns: ['pieceId'],
              references: { table: 'piece', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
            {
              columns: ['artifactId'],
              references: { table: 'artifact', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: ['artifactId', 'pieceId'],
        indexes: [
          { name: 'pieceArtifact_pieceId_idx', columns: ['pieceId'] },
          { name: 'pieceArtifact_artifactId_idx', columns: ['artifactId'] },
        ],
        summary:
          'Recreates table pieceArtifact to apply schema changes: database/pieceArtifact/foreign-key:pieceId->.piece(id); database/pieceArtifact/foreign-key:artifactId->.artifact(id)',
        postchecks: [
          {
            description: 'verify foreign key (pieceId) → piece(id) on "pieceArtifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('pieceArtifact') f WHERE f.\"table\" = 'piece' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('pieceId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
          {
            description: 'verify foreign key (artifactId) → artifact(id) on "pieceArtifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('pieceArtifact') f WHERE f.\"table\" = 'artifact' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('artifactId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
      this.recreateTable({
        tableName: 'pieceReport',
        contractTable: {
          columns: [
            { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'reportId', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['pieceId', 'reportId'] },
          uniques: [],
          foreignKeys: [
            {
              columns: ['pieceId'],
              references: { table: 'piece', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
            {
              columns: ['reportId'],
              references: { table: 'report', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: ['pieceId', 'reportId'],
        indexes: [
          { name: 'pieceReport_pieceId_idx', columns: ['pieceId'] },
          { name: 'pieceReport_reportId_idx', columns: ['reportId'] },
        ],
        summary:
          'Recreates table pieceReport to apply schema changes: database/pieceReport/foreign-key:pieceId->.piece(id); database/pieceReport/foreign-key:reportId->.report(id)',
        postchecks: [
          {
            description: 'verify foreign key (pieceId) → piece(id) on "pieceReport"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('pieceReport') f WHERE f.\"table\" = 'piece' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('pieceId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
          {
            description: 'verify foreign key (reportId) → report(id) on "pieceReport"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('pieceReport') f WHERE f.\"table\" = 'report' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('reportId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
