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
        table: 'boardEntry',
        column: { name: 'coversFrom', typeSql: 'INTEGER', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'boardEntry',
        column: { name: 'coversTo', typeSql: 'INTEGER', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'boardEntry',
        column: { name: 'level', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      dataTransform({
        id: 'data.boardEntry.roughenAgentNotes',
        label: 'Move agent-written notes to the rough register',
        table: 'boardEntry',
        description:
          'the smooth register now holds summaries and what the admiral wrote, so notes an agent left fold under a summary instead',
        run: () =>
          `UPDATE "boardEntry"
              SET "register" = 'rough'
            WHERE "register" = 'smooth' AND "kind" = 'note' AND "authorAgentId" IS NOT NULL`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
