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
        table: 'rulingApprovedPiece',
        columns: [
          col('pieceId', 'TEXT', { notNull: true }),
          col('rulingId', 'TEXT', { notNull: true }),
        ],
        constraints: [
          primaryKey(['rulingId', 'pieceId']),
          foreignKey(['rulingId'], 'ruling', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['pieceId'], 'piece', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
        ],
      }),
      this.addColumn({
        table: 'ruling',
        column: {
          name: 'kind',
          typeSql: 'TEXT',
          defaultSql: "DEFAULT 'ruling'",
          nullable: false,
        },
      }),
      this.createIndex({
        table: 'rulingApprovedPiece',
        index: 'rulingApprovedPiece_pieceId_idx',
        columns: ['pieceId'],
      }),
      this.createIndex({
        table: 'rulingApprovedPiece',
        index: 'rulingApprovedPiece_rulingId_idx',
        columns: ['rulingId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
