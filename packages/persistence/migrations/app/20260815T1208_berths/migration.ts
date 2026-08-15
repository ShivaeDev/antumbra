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
        table: 'berth',
        columns: [
          col('agentId', 'TEXT', { notNull: true }),
          col('branch', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('id', 'TEXT', { notNull: true }),
          col('path', 'TEXT', { notNull: true }),
          col('ref', 'TEXT', { notNull: true }),
          col('runner', 'TEXT', { notNull: true }),
          col('slug', 'TEXT', { notNull: true }),
          col('source', 'TEXT', { notNull: true }),
          col('status', 'TEXT', { notNull: true }),
          col('strandedAt', 'TEXT'),
          col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({ table: 'berth', index: 'berth_agentId_idx', columns: ['agentId'] }),
      this.createIndex({ table: 'berth', index: 'berth_status_idx', columns: ['status'] }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
