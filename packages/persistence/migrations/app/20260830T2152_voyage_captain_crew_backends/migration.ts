#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, dataTransform } from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        table: 'voyage',
        column: { name: 'captainBackend', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'voyage',
        column: { name: 'crewBackend', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      dataTransform({
        id: 'voyage.backend.split',
        label: 'Copy the voyage backend to both seats',
        table: 'voyage',
        description: 'copy backend to captainBackend and crewBackend',
        run: () => 'UPDATE "voyage" SET "captainBackend" = "backend", "crewBackend" = "backend"',
      }),
      this.recreateTable({
        tableName: 'voyage',
        contractTable: {
          columns: [
            { name: 'captainBackend', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'context', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'createdAt', typeSql: 'TEXT', defaultSql: "DEFAULT (datetime('now'))", nullable: false },
            { name: 'crewBackend', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'focusedAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'kind', typeSql: 'TEXT', defaultSql: "DEFAULT 'voyage'", nullable: false },
            { name: 'name', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'northStar', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [],
          foreignKeys: [],
        },
        schemaColumnNames: ['captainBackend', 'context', 'createdAt', 'crewBackend', 'focusedAt', 'id', 'kind', 'name', 'northStar'],
        indexes: [],
        summary: 'Require both voyage backends and remove backend',
        postchecks: [
          {
            description: 'verify column "backend" is gone from "voyage"',
            sql: 'SELECT COUNT(*) = 0 AS "result" FROM pragma_table_info(\'voyage\') WHERE "name" = \'backend\'',
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
