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
        table: 'rulingContext',
        columns: [
          col('at', 'TEXT', { notNull: true }),
          col('authorAgentId', 'TEXT'),
          col('body', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('rulingId', 'TEXT', { notNull: true }),
        ],
        constraints: [
          primaryKey(['id']),
          foreignKey(['rulingId'], 'ruling', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['authorAgentId'], 'agent', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
        ],
      }),
      this.addColumn({
        table: 'ruling',
        column: { name: 'parkedAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'ruling',
        column: { name: 'parkedNote', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.createIndex({
        table: 'rulingContext',
        index: 'rulingContext_rulingId_idx',
        columns: ['rulingId'],
      }),
      this.createIndex({
        table: 'rulingContext',
        index: 'rulingContext_authorAgentId_idx',
        columns: ['authorAgentId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
