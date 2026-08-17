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
        description: 'fail before supersession storage when Artifact provenance is missing or ambiguous',
        run: () => `INSERT INTO "artifact" ("id", "authorAgentId", "title", "uri", "createdAt")
SELECT a."id", a."authorAgentId", a."title", a."uri", a."createdAt"
FROM "artifact" a LEFT JOIN "pieceArtifact" pa ON pa."artifactId" = a."id"
GROUP BY a."id" HAVING COUNT(pa."artifactId") <> 1`,
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
      this.recreateTable({
        tableName: 'pieceArtifact',
        contractTable: {
          columns: [
            { name: 'artifactId', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'pieceId', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['pieceId', 'artifactId'] },
          uniques: [{ columns: ['artifactId'] }],
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
          { name: 'pieceArtifact_artifactId_idx', columns: ['artifactId'] },
          { name: 'pieceArtifact_pieceId_idx', columns: ['pieceId'] },
        ],
        summary:
          'Recreates table pieceArtifact to apply schema changes: database/pieceArtifact/unique:artifactId',
        postchecks: [
          {
            description: 'verify unique constraint (artifactId) on "pieceArtifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_index_list('pieceArtifact') l WHERE l.\"unique\" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name) WHERE name IN ('artifactId')) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
