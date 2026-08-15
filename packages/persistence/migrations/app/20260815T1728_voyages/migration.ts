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
        table: 'artifact',
        columns: [
          col('authorAgentId', 'TEXT'),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('id', 'TEXT', { notNull: true }),
          col('title', 'TEXT', { notNull: true }),
          col('uri', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'piece',
        columns: [
          col('charter', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('expectation', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('launchedAt', 'TEXT'),
          col('parkedAt', 'TEXT'),
          col('role', 'TEXT', { notNull: true }),
          col('title', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'pieceAgent',
        columns: [
          col('agentId', 'TEXT', { notNull: true }),
          col('assignedAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('pieceId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['pieceId', 'agentId'])],
      }),
      this.createTable({
        table: 'pieceArtifact',
        columns: [
          col('artifactId', 'TEXT', { notNull: true }),
          col('pieceId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['pieceId', 'artifactId'])],
      }),
      this.createTable({
        table: 'pieceEdge',
        columns: [
          col('fromPieceId', 'TEXT', { notNull: true }),
          col('toPieceId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['fromPieceId', 'toPieceId'])],
      }),
      this.createTable({
        table: 'pieceReport',
        columns: [
          col('pieceId', 'TEXT', { notNull: true }),
          col('reportId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['pieceId', 'reportId'])],
      }),
      this.createTable({
        table: 'report',
        columns: [
          col('authorAgentId', 'TEXT'),
          col('body', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('id', 'TEXT', { notNull: true }),
          col('title', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'voyage',
        columns: [
          col('backend', 'TEXT', { notNull: true }),
          col('context', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('focusedAt', 'TEXT'),
          col('id', 'TEXT', { notNull: true }),
          col('name', 'TEXT', { notNull: true }),
          col('northStar', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        table: 'voyageAgent',
        columns: [
          col('agentId', 'TEXT', { notNull: true }),
          col('role', 'TEXT', { notNull: true }),
          col('voyageId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['voyageId', 'agentId'])],
      }),
      this.createTable({
        table: 'voyagePiece',
        columns: [
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('pieceId', 'TEXT', { notNull: true }),
          col('voyageId', 'TEXT', { notNull: true }),
        ],
        constraints: [primaryKey(['voyageId', 'pieceId'])],
      }),
      this.createIndex({
        table: 'pieceAgent',
        index: 'pieceAgent_agentId_idx',
        columns: ['agentId'],
      }),
      this.createIndex({
        table: 'pieceEdge',
        index: 'pieceEdge_toPieceId_idx',
        columns: ['toPieceId'],
      }),
      this.createIndex({
        table: 'voyageAgent',
        index: 'voyageAgent_agentId_idx',
        columns: ['agentId'],
      }),
      this.createIndex({
        table: 'voyagePiece',
        index: 'voyagePiece_pieceId_idx',
        columns: ['pieceId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
