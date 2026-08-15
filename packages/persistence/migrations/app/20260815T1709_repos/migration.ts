#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  primaryKey,
  unique,
} from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'repo',
        columns: [
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('defaultRef', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('name', 'TEXT', { notNull: true }),
          col('source', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id']), unique(['source'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
