#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import {
  SESSION_INPUT_INSERT_GUARD,
  SESSION_INPUT_PART_INSERT_GUARD,
  SESSION_INPUT_PART_UPDATE_GUARD,
  SESSION_INPUT_UPDATE_GUARD,
} from './guards.ts';
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  foreignKey,
  primaryKey,
  rawSql,
  unique,
} from '@prisma-next/sqlite/migration';

const guard = (name: string, table: string, sql: string) =>
  rawSql({
    id: `${table}.${name}`,
    label: `Install ${name}`,
    summary: `fail closed when ${table} durable invariants are violated`,
    operationClass: 'additive',
    target: {
      id: 'sqlite',
      details: { schema: 'main', objectType: 'trigger', name },
    },
    precheck: [
      {
        description: `ensure trigger "${name}" does not exist`,
        sql: 'SELECT COUNT(*) = 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
        params: ['trigger', name],
      },
    ],
    execute: [{ description: `install ${name}`, sql }],
    postcheck: [
      {
        description: `verify trigger "${name}" exists`,
        sql: 'SELECT COUNT(*) > 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
        params: ['trigger', name],
      },
    ],
  });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'sessionAttachment',
        columns: [
          col('byteSize', 'INTEGER', { notNull: true }),
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('digest', 'TEXT', { notNull: true }),
          col('height', 'INTEGER', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('mediaType', 'TEXT', { notNull: true }),
          col('width', 'INTEGER', { notNull: true }),
        ],
        constraints: [primaryKey(['id']), unique(['digest'])],
      }),
      this.createTable({
        table: 'sessionInput',
        columns: [
          col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
          col('deliveryStatus', 'TEXT', { notNull: true }),
          col('id', 'TEXT', { notNull: true }),
          col('requestDigest', 'TEXT', { notNull: true }),
          col('sessionId', 'TEXT', { notNull: true }),
        ],
        constraints: [
          primaryKey(['id']),
          foreignKey(['sessionId'], 'agentSession', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
        ],
      }),
      this.createTable({
        table: 'sessionInputPart',
        columns: [
          col('attachmentId', 'TEXT'),
          col('displayName', 'TEXT'),
          col('inputId', 'TEXT', { notNull: true }),
          col('kind', 'TEXT', { notNull: true }),
          col('position', 'INTEGER', { notNull: true }),
          col('text', 'TEXT'),
        ],
        constraints: [
          primaryKey(['inputId', 'position']),
          foreignKey(['inputId'], 'sessionInput', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
          foreignKey(['attachmentId'], 'sessionAttachment', ['id'], {
            onDelete: 'restrict',
            onUpdate: 'restrict',
          }),
        ],
      }),
      this.createIndex({
        table: 'sessionInput',
        index: 'sessionInput_sessionId_createdAt_idx',
        columns: ['sessionId', 'createdAt'],
      }),
      this.createIndex({
        table: 'sessionInput',
        index: 'sessionInput_sessionId_idx',
        columns: ['sessionId'],
      }),
      this.createIndex({
        table: 'sessionInputPart',
        index: 'sessionInputPart_attachmentId_idx',
        columns: ['attachmentId'],
      }),
      this.createIndex({
        table: 'sessionInputPart',
        index: 'sessionInputPart_inputId_idx',
        columns: ['inputId'],
      }),
      guard('sessionInput_validate_insert', 'sessionInput', SESSION_INPUT_INSERT_GUARD),
      guard('sessionInput_validate_update', 'sessionInput', SESSION_INPUT_UPDATE_GUARD),
      guard(
        'sessionInputPart_validate_insert',
        'sessionInputPart',
        SESSION_INPUT_PART_INSERT_GUARD,
      ),
      guard(
        'sessionInputPart_reject_update',
        'sessionInputPart',
        SESSION_INPUT_PART_UPDATE_GUARD,
      ),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
