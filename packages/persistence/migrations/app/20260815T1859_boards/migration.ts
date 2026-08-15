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
        table: 'agentBoard',
        columns: [
          col('agentId', 'TEXT', { notNull: true }),
          col('boardId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['agentId', 'boardId'])],
      }),
      this.createTable({
        table: 'board',
        columns: [
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('id', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'boardEntry',
        columns: [
          col('authorAgentId', 'TEXT'),
          col('boardId', 'TEXT', { notNull: true }),
          col('body', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('id', 'TEXT', { notNull: true }),
          col('register', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'pieceBoard',
        columns: [
          col('boardId', 'TEXT', { notNull: true }),
          col('pieceId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['pieceId', 'boardId'])],
      }),
      this.createTable({
        table: 'voyageBoard',
        columns: [
          col('boardId', 'TEXT', { notNull: true }),
          col('voyageId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['voyageId', 'boardId'])],
      }),
      this.createIndex({
        table: 'boardEntry',
        index: 'boardEntry_boardId_idx',
        columns: ['boardId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
