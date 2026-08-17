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
      this.addColumn({
        table: 'agentSession',
        column: {
          name: 'executionStatus',
          typeSql: 'TEXT',
          defaultSql: "DEFAULT 'active'",
          nullable: false,
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
