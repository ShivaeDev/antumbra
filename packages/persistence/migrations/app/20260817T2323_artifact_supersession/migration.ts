#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  dataTransform,
  foreignKey,
  primaryKey,
  unique,
} from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      dataTransform({
        id: 'artifact.provenance.guard-exactly-one-piece',
        label: 'Reject Artifacts without exactly one producing Piece',
        table: 'artifact',
        description: 'fail before direct provenance storage when Artifact provenance is missing or ambiguous',
        run: () => `INSERT INTO "artifact" ("id", "authorAgentId", "title", "uri", "createdAt")
SELECT a."id", a."authorAgentId", a."title", a."uri", a."createdAt"
FROM "artifact" a LEFT JOIN "pieceArtifact" pa ON pa."artifactId" = a."id"
GROUP BY a."id" HAVING COUNT(pa."artifactId") <> 1`,
      }),
      this.addColumn({
        table: 'artifact',
        column: { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      dataTransform({
        id: 'artifact.provenance.store-originating-piece',
        label: 'Store each Artifact producing Piece directly',
        table: 'artifact',
        description: 'copy validated producing-Piece provenance onto its Artifact',
        run: () => `UPDATE "artifact" SET "pieceId" = (
  SELECT pa."pieceId" FROM "pieceArtifact" pa
  WHERE pa."artifactId" = "artifact"."id"
)`,
      }),
      this.dropTable({ table: 'pieceArtifact' }),
      this.recreateTable({
        tableName: 'artifact',
        contractTable: {
          columns: [
            { name: 'authorAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            {
              name: 'createdAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'title', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'uri', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [],
          foreignKeys: [
            {
              columns: ['pieceId'],
              references: { table: 'piece', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: ['authorAgentId', 'createdAt', 'id', 'pieceId', 'title', 'uri'],
        indexes: [{ name: 'artifact_pieceId_idx', columns: ['pieceId'] }],
        summary:
          'Recreates table artifact to apply schema changes: database/artifact/foreign-key:pieceId->.piece(id)',
        postchecks: [
          {
            description: 'verify foreign key (pieceId) → piece(id) on "artifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('artifact') f WHERE f.\"table\" = 'piece' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('pieceId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
      this.createTable({
        table: 'artifactSupersession',
        columns: [
          col('successorArtifactId', 'TEXT', { notNull: true }),
          col('supersededArtifactId', 'TEXT', { notNull: true }),
        ],
        constraints: [
          primaryKey(['supersededArtifactId']),
          unique(['successorArtifactId']),
          foreignKey(['supersededArtifactId'], 'artifact', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['successorArtifactId'], 'artifact', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
