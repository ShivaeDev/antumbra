#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  foreignKey,
  primaryKey,
} from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'rulingReclassification',
        columns: [
          col('at', 'TEXT', { notNull: true }),
          col('by', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('note', 'TEXT'),
          col('radius', 'TEXT'),
          col('rulingId', 'TEXT', { notNull: true }),
          col('urgency', 'TEXT'),
        ],
        constraints: [
          primaryKey(['id']),
          foreignKey(['rulingId'], 'ruling', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
        ],
      }),
      this.createIndex({
        table: 'rulingReclassification',
        index: 'rulingReclassification_rulingId_idx',
        columns: ['rulingId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
