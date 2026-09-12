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
        tableName: 'artifact',
        contractTable: {
          columns: [
            { name: 'authorAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'basename', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'byteSize', typeSql: 'INTEGER', defaultSql: '', nullable: false },
            {
              name: 'createdAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
            { name: 'digest', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            {
              name: 'supersededByArtifactId',
              typeSql: 'TEXT',
              defaultSql: '',
              nullable: true,
            },
            { name: 'title', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [{ columns: ['supersededByArtifactId'] }],
          foreignKeys: [
            {
              columns: ['supersededByArtifactId'],
              references: { table: 'artifact', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: [
          'authorAgentId',
          'basename',
          'byteSize',
          'createdAt',
          'digest',
          'id',
          'pieceId',
          'supersededByArtifactId',
          'title',
        ],
        indexes: [{ name: 'artifact_pieceId_idx', columns: ['pieceId'] }],
        summary:
          'Recreates table artifact to apply schema changes: database/artifact/foreign-key:pieceId->.piece(id)',
        postchecks: [
          {
            description: 'verify foreign key (pieceId) → piece(id) is gone from "artifact"',
            sql: "SELECT COUNT(*) = 0 AS \"result\" FROM pragma_foreign_key_list('artifact') WHERE \"table\" = 'piece'",
          },
          {
            description: 'verify foreign key (supersededByArtifactId) → artifact(id) on "artifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('artifact') f WHERE f.\"table\" = 'artifact' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('supersededByArtifactId', 'id')) THEN 1 ELSE 0 END) = 1)",
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
              columns: ['reportId'],
              references: { table: 'report', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: ['pieceId', 'reportId'],
        indexes: [{ name: 'pieceReport_reportId_idx', columns: ['reportId'] }],
        summary:
          'Recreates table pieceReport to apply schema changes: database/pieceReport/foreign-key:pieceId->.piece(id)',
        postchecks: [
          {
            description: 'verify foreign key (pieceId) → piece(id) is gone from "pieceReport"',
            sql: "SELECT COUNT(*) = 0 AS \"result\" FROM pragma_foreign_key_list('pieceReport') WHERE \"table\" = 'piece'",
          },
          {
            description: 'verify foreign key (reportId) → report(id) on "pieceReport"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('pieceReport') f WHERE f.\"table\" = 'report' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('reportId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
      this.recreateTable({
        tableName: 'rulingGate',
        contractTable: {
          columns: [
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'rulingId', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [{ columns: ['rulingId', 'pieceId'] }],
          foreignKeys: [
            {
              columns: ['rulingId'],
              references: { table: 'ruling', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: ['id', 'pieceId', 'rulingId'],
        indexes: [{ name: 'rulingGate_rulingId_idx', columns: ['rulingId'] }],
        summary:
          'Recreates table rulingGate to apply schema changes: database/rulingGate/foreign-key:pieceId->.piece(id)',
        postchecks: [
          {
            description: 'verify foreign key (pieceId) → piece(id) is gone from "rulingGate"',
            sql: "SELECT COUNT(*) = 0 AS \"result\" FROM pragma_foreign_key_list('rulingGate') WHERE \"table\" = 'piece'",
          },
          {
            description: 'verify foreign key (rulingId) → ruling(id) on "rulingGate"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingGate') f WHERE f.\"table\" = 'ruling' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('rulingId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
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
          { name: 'rulingSubject_agentId_idx', columns: ['agentId'] },
        ],
        summary:
          'Recreates table rulingSubject to apply schema changes: database/rulingSubject/foreign-key:pieceId->.piece(id)',
        postchecks: [
          {
            description: 'verify foreign key (pieceId) → piece(id) is gone from "rulingSubject"',
            sql: "SELECT COUNT(*) = 0 AS \"result\" FROM pragma_foreign_key_list('rulingSubject') WHERE \"table\" = 'piece'",
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
            description: 'verify foreign key (agentId) → agent(id) on "rulingSubject"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingSubject') f WHERE f.\"table\" = 'agent' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('agentId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
      this.dropIndex({ table: 'pieceReport', index: 'pieceReport_pieceId_idx' }),
      this.dropIndex({ table: 'rulingGate', index: 'rulingGate_pieceId_idx' }),
      this.dropIndex({ table: 'rulingSubject', index: 'rulingSubject_pieceId_idx' }),
      this.dropTable({ table: 'piece' }),
      this.dropTable({ table: 'pieceEdge' }),
      this.dropTable({ table: 'pieceVerdict' }),
      this.dropTable({ table: 'voyagePiece' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
