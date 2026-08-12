#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'intent',
        columns: [
          col('created_at', 'TEXT', { notNull: true, default: fn('now()') }),
          col('detail', 'TEXT'),
          col('id', 'TEXT', { notNull: true }),
          col('payload', 'TEXT', { notNull: true }),
          col('resume_policy', 'TEXT', { notNull: true }),
          col('status', 'TEXT', { notNull: true }),
          col('tag', 'TEXT', { notNull: true }),
          col('updated_at', 'TEXT', { notNull: true, default: fn('now()') }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({ table: 'intent', index: 'intent_status_idx', columns: ['status'] }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
