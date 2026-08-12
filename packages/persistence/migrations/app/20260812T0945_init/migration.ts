#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma-next/sqlite/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'app_meta',
        columns: [
          col('key', 'TEXT', { notNull: true }),
          col('updated_at', 'TEXT', { notNull: true, default: fn('now()') }),
          col('value', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['key'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
