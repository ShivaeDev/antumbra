#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'changeTransition',
        columns: [
          col('activityAt', 'TEXT', { notNull: true }),
          col('changeId', 'TEXT', { notNull: true }),
          col('fromStage', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('observedAt', 'TEXT', { notNull: true }),
          col('toStage', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        table: 'changeTransition',
        index: 'changeTransition_changeId_activityAt_idx',
        columns: ['changeId', 'activityAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
