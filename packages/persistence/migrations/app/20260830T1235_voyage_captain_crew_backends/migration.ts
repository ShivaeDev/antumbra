#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, dataTransform } from '@prisma-next/sqlite/migration';

const SPLIT_ONE_BACKEND_IN_TWO = `UPDATE "voyage"
SET "captainBackend" = "backend", "crewBackend" = "backend"`;

// why: the two columns are added nullable so the backfill has somewhere to
// write, and the table is recreated afterwards to make them required — SQLite
// cannot add a NOT NULL column without a default, and a default here would
// outlive the migration as a schema fact the contract never declared.
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
        label: 'Seat both backends where one sailed',
        table: 'voyage',
        description: 'copy the voyage backend onto the captain and the crew alike',
        run: () => SPLIT_ONE_BACKEND_IN_TWO,
      }),
      this.recreateTable({
        tableName: 'voyage',
        contractTable: {
          columns: [
            { name: 'captainBackend', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'context', typeSql: 'TEXT', defaultSql: '', nullable: false },
            {
              name: 'createdAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
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
        schemaColumnNames: [
          'captainBackend',
          'context',
          'createdAt',
          'crewBackend',
          'focusedAt',
          'id',
          'kind',
          'name',
          'northStar',
        ],
        indexes: [],
        summary: 'Recreates table voyage to require both backends and drop column backend',
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
