import { col, fn, foreignKey, lit, primaryKey, unique } from '@prisma-next/sqlite/migration';

export const AGENTS_TABLES = [
  {
    table: 'agent',
    columns: [
      col('charter', 'TEXT', { notNull: true }),
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('currentSessionId', 'TEXT'),
      col('id', 'TEXT', { notNull: true }),
      col('role', 'TEXT', { notNull: true }),
      col('status', 'TEXT', { notNull: true }),
      col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
    ],
    constraints: [primaryKey(['id']), unique(['currentSessionId'])],
  },
  {
    table: 'agentSession',
    columns: [
      col('agentId', 'TEXT', { notNull: true }),
      col('backend', 'TEXT', { notNull: true, default: lit('claude') }),
      col('charterDeliveredAt', 'TEXT'),
      col('completeness', 'TEXT', { notNull: true, default: lit('recording') }),
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('cwd', 'TEXT', { notNull: true }),
      col('executionStatus', 'TEXT', { notNull: true, default: lit('active') }),
      col('id', 'TEXT', { notNull: true }),
      col('kind', 'TEXT'),
      col('label', 'TEXT'),
      col('nativeRef', 'TEXT'),
      col('outcome', 'TEXT'),
      col('parentSessionId', 'TEXT'),
      col('rootSessionId', 'TEXT', { notNull: true }),
      col('status', 'TEXT', { notNull: true }),
    ],
    constraints: [
      primaryKey(['id']),
      foreignKey(['parentSessionId'], 'agentSession', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
      foreignKey(['rootSessionId'], 'agentSession', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    ],
  },
  {
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
  },
  {
    table: 'sessionEvent',
    columns: [
      col('at', 'TEXT', { notNull: true, default: fn('now()') }),
      col('kind', 'TEXT', { notNull: true }),
      col('payload', 'TEXT', { notNull: true }),
      col('seq', 'INTEGER', { notNull: true }),
      col('sessionId', 'TEXT', { notNull: true }),
    ],
    constraints: [
      primaryKey(['sessionId', 'seq']),
      foreignKey(['sessionId'], 'agentSession', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    ],
  },
  {
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
  },
  {
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
  },
];
