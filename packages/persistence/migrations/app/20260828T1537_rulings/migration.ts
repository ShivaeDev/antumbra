#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
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
        table: 'ruling',
        columns: [
          col('answer', 'TEXT'),
          col('answerChoiceId', 'TEXT'),
          col('context', 'TEXT', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('id', 'TEXT', { notNull: true }),
          col('question', 'TEXT', { notNull: true }),
          col('radius', 'TEXT', { notNull: true }),
          col('requesterAgentId', 'TEXT', { notNull: true }),
          col('ruledAt', 'TEXT'),
          col('ruledBy', 'TEXT'),
          col('urgency', 'TEXT', { notNull: true }),
        ],
        constraints: [
          primaryKey(['id']),
          foreignKey(['requesterAgentId'], 'agent', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['answerChoiceId'], 'rulingChoice', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
        ],
      }),
      this.createTable({
        table: 'rulingChoice',
        columns: [
          col('detail', 'TEXT'),
          col('id', 'TEXT', { notNull: true }),
          col('label', 'TEXT', { notNull: true }),
          col('position', 'INTEGER', { notNull: true }),
          col('rulingId', 'TEXT', { notNull: true }),
        ],
        constraints: [
          primaryKey(['id']),
          unique(['rulingId', 'position']),
          foreignKey(['rulingId'], 'ruling', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
        ],
      }),
      this.createTable({
        table: 'rulingSubject',
        columns: [
          col('agentId', 'TEXT'),
          col('id', 'TEXT', { notNull: true }),
          col('kind', 'TEXT', { notNull: true }),
          col('pieceId', 'TEXT'),
          col('repoId', 'TEXT'),
          col('rulingId', 'TEXT', { notNull: true }),
          col('tag', 'TEXT'),
          col('voyageId', 'TEXT'),
        ],
        constraints: [
          primaryKey(['id']),
          foreignKey(['rulingId'], 'ruling', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['repoId'], 'repo', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
          foreignKey(['voyageId'], 'voyage', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['pieceId'], 'piece', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
          foreignKey(['agentId'], 'agent', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
        ],
      }),
      this.createIndex({ table: 'ruling', index: 'ruling_ruledAt_idx', columns: ['ruledAt'] }),
      this.createIndex({
        table: 'ruling',
        index: 'ruling_requesterAgentId_idx',
        columns: ['requesterAgentId'],
      }),
      this.createIndex({
        table: 'ruling',
        index: 'ruling_answerChoiceId_idx',
        columns: ['answerChoiceId'],
      }),
      this.createIndex({
        table: 'rulingChoice',
        index: 'rulingChoice_rulingId_idx',
        columns: ['rulingId'],
      }),
      this.createIndex({
        table: 'rulingSubject',
        index: 'rulingSubject_tag_idx',
        columns: ['tag'],
      }),
      this.createIndex({
        table: 'rulingSubject',
        index: 'rulingSubject_rulingId_idx',
        columns: ['rulingId'],
      }),
      this.createIndex({
        table: 'rulingSubject',
        index: 'rulingSubject_repoId_idx',
        columns: ['repoId'],
      }),
      this.createIndex({
        table: 'rulingSubject',
        index: 'rulingSubject_voyageId_idx',
        columns: ['voyageId'],
      }),
      this.createIndex({
        table: 'rulingSubject',
        index: 'rulingSubject_pieceId_idx',
        columns: ['pieceId'],
      }),
      this.createIndex({
        table: 'rulingSubject',
        index: 'rulingSubject_agentId_idx',
        columns: ['agentId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
