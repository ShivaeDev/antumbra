#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, dataTransform } from '@prisma-next/sqlite/migration';
import {
  backfillVerifiedMetadata,
  consumeArtifactCustodyStaging,
  requireCompleteVerifiedStaging,
} from './custody-sql.ts';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      dataTransform({
        id: 'artifact.custody.require-complete-verified-staging',
        label: 'Require exact verified Artifact custody staging',
        table: 'artifact',
        description: 'refuse migration unless filesystem preflight staged the exact unchanged legacy Artifact set',
        run: requireCompleteVerifiedStaging,
      }),
      this.addColumn({
        table: 'artifact',
        column: { name: 'basename', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'artifact',
        column: { name: 'byteSize', typeSql: 'INTEGER', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'artifact',
        column: { name: 'digest', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      dataTransform({
        id: 'artifact.custody.backfill-verified-metadata',
        label: 'Backfill verified immutable Artifact custody metadata',
        table: 'artifact',
        description: 'copy only filesystem-proven metadata from exact staging rows',
        run: backfillVerifiedMetadata,
      }),
      dataTransform({
        id: 'artifact.custody.consume-staging',
        label: 'Consume Artifact custody staging',
        table: 'appMeta',
        description: 'remove migration-private staging only after every Artifact was backfilled',
        run: consumeArtifactCustodyStaging,
      }),
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
              columns: ['pieceId'],
              references: { table: 'piece', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
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
        summary: 'Recreates artifact with immutable CAS custody metadata and no URI authority',
        postchecks: [
          {
            description: 'verify custody columns are required and URI is absent on "artifact"',
            sql: "SELECT (SELECT COUNT(*) FROM pragma_table_info('artifact') WHERE name IN ('basename', 'byteSize', 'digest') AND \"notnull\" = 1) = 3 AND (SELECT COUNT(*) FROM pragma_table_info('artifact') WHERE name = 'uri') = 0",
          },
          {
            description: 'verify unique constraint (supersededByArtifactId) on "artifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_index_list('artifact') l WHERE l.\"unique\" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name) WHERE name IN ('supersededByArtifactId')) = 1)",
          },
          {
            description: 'verify foreign key (pieceId) → piece(id) on "artifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('artifact') f WHERE f.\"table\" = 'piece' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('pieceId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
          {
            description: 'verify foreign key (supersededByArtifactId) → artifact(id) on "artifact"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('artifact') f WHERE f.\"table\" = 'artifact' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('supersededByArtifactId', 'id')) THEN 1 ELSE 0 END) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
