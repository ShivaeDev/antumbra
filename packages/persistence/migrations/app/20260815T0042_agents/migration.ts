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
        table: 'agent',
        columns: [
          col('charter', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('id', 'TEXT', { notNull: true }),
          col('role', 'TEXT', { notNull: true }),
          col('status', 'TEXT', { notNull: true }),
          col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'agentSession',
        columns: [
          col('agentId', 'TEXT', { notNull: true }),
          col('charterDeliveredAt', 'TEXT'),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('cwd', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('status', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'sessionEvent',
        columns: [
          col('at', 'TEXT', { notNull: true, default: fn('now()') }),
          col('kind', 'TEXT', { notNull: true }),
          col('payload', 'TEXT', { notNull: true }),
          col('seq', 'INTEGER', { notNull: true }),
          col('sessionId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['sessionId', 'seq'])],
      }),
      this.createIndex({ table: 'agent', index: 'agent_status_idx', columns: ['status'] }),
      this.createIndex({
        table: 'agentSession',
        index: 'agentSession_agentId_idx',
        columns: ['agentId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
