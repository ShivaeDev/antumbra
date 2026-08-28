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
  unique,
} from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'rulingGate',
        columns: [
          col('id', 'TEXT', { notNull: true }),
          col('pieceId', 'TEXT', { notNull: true }),
          col('rulingId', 'TEXT', { notNull: true }),
        ],
        constraints: [
          primaryKey(['id']),
          unique(['rulingId', 'pieceId']),
          foreignKey(['rulingId'], 'ruling', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['pieceId'], 'piece', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
        ],
      }),
      this.createIndex({
        table: 'rulingGate',
        index: 'rulingGate_rulingId_idx',
        columns: ['rulingId'],
      }),
      this.createIndex({
        table: 'rulingGate',
        index: 'rulingGate_pieceId_idx',
        columns: ['pieceId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
