#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma-next/sqlite/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'appMeta',
        columns: [
          col('key', 'TEXT', { notNull: true }),
          col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('value', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['key'])],
      }),
      this.createTable({
        table: 'intent',
        columns: [
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('detail', 'TEXT'),
          col('id', 'TEXT', { notNull: true }),
          col('payload', 'TEXT', { notNull: true }),
          col('status', 'TEXT', { notNull: true }),
          col('tag', 'TEXT', { notNull: true }),
          col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({ table: 'intent', index: 'intent_status_idx', columns: ['status'] }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
