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
        table: 'change',
        columns: [
          col('activityAt', 'TEXT', { notNull: true }),
          col('baseRef', 'TEXT', { notNull: true }),
          col('body', 'TEXT', { notNull: true }),
          col('checks', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('draftAt', 'TEXT'),
          col('externalId', 'TEXT'),
          col('headRef', 'TEXT', { notNull: true }),
          col('headSha', 'TEXT'),
          col('host', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('landedAt', 'TEXT'),
          col('mergeable', 'TEXT', { notNull: true }),
          col('observedAt', 'TEXT', { notNull: true }),
          col('openedByAgentId', 'TEXT'),
          col('raw', 'TEXT'),
          col('repoId', 'TEXT', { notNull: true }),
          col('review', 'TEXT', { notNull: true }),
          col('stage', 'TEXT', { notNull: true }),
          col('title', 'TEXT', { notNull: true }),
          col('url', 'TEXT'),
          col('withdrawnAt', 'TEXT'),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'pieceChange',
        columns: [
          col('changeId', 'TEXT', { notNull: true }),
          col('pieceId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['pieceId', 'changeId'])],
      }),
      this.createIndex({ table: 'change', index: 'change_repoId_idx', columns: ['repoId'] }),
      this.createIndex({
        table: 'change',
        index: 'change_host_externalId_idx',
        columns: ['host', 'externalId'],
      }),
      this.createIndex({
        table: 'pieceChange',
        index: 'pieceChange_changeId_idx',
        columns: ['changeId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
