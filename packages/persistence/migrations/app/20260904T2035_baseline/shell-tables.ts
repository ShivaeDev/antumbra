import { col, fn, primaryKey } from '@prisma-next/sqlite/migration';

export const SHELL_TABLES = [
  {
    table: 'appMeta',
    columns: [
      col('key', 'TEXT', { notNull: true }),
      col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('value', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['key'])],
  },
  {
    table: 'backendCapacity',
    columns: [
      col('backend', 'TEXT', { notNull: true }),
      col('detail', 'TEXT'),
      col('observedAt', 'TEXT', { notNull: true }),
      col('reason', 'TEXT'),
      col('resetsAt', 'TEXT'),
      col('status', 'TEXT', { notNull: true }),
      col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('utilization', 'REAL'),
    ],
    constraints: [primaryKey(['backend'])],
  },
  {
    table: 'intent',
    columns: [
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('detail', 'TEXT'),
      col('id', 'TEXT', { notNull: true }),
      col('payload', 'TEXT', { notNull: true }),
      col('status', 'TEXT', { notNull: true }),
      col('tag', 'TEXT', { notNull: true }),
      col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
    ],
    constraints: [primaryKey(['id'])],
  },
  {
    table: 'setting',
    columns: [
      col('key', 'TEXT', { notNull: true }),
      col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('value', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['key'])],
  },
];
