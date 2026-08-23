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
        table: 'changeVerdict',
        columns: [
          col('changeId', 'TEXT', { notNull: true }),
          col('landedAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('verdict', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['changeId'])],
      }),
      this.createTable({
        table: 'pieceVerdict',
        columns: [
          col('landedAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('pieceId', 'TEXT', { notNull: true }),
          col('verdict', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['pieceId'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
