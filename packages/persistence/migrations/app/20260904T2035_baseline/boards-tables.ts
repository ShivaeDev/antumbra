import { col, fn, lit, primaryKey, unique } from '@prisma-next/sqlite/migration';

export const BOARDS_TABLES = [
  {
    table: 'board',
    columns: [
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('id', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['id'])],
  },
  {
    table: 'boardEntry',
    columns: [
      col('authorAgentId', 'TEXT'),
      col('boardId', 'TEXT', { notNull: true }),
      col('body', 'TEXT', { notNull: true }),
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('id', 'TEXT', { notNull: true }),
      col('kind', 'TEXT', { notNull: true, default: lit('note') }),
      col('precedence', 'TEXT', { notNull: true, default: lit('routine') }),
      col('register', 'TEXT', { notNull: true }),
      col('seq', 'INTEGER', { notNull: true }),
      col('sourceRef', 'TEXT'),
    ],
    constraints: [
      primaryKey(['id']),
      unique(['boardId', 'seq']),
      unique(['boardId', 'sourceRef']),
    ],
  },
  {
    table: 'boardEntryReceipt',
    columns: [
      col('entryId', 'TEXT', { notNull: true }),
      col('readAt', 'TEXT', { notNull: true, default: fn('now()') }),
    ],
    constraints: [primaryKey(['entryId'])],
  },
  {
    table: 'boardOwner',
    columns: [
      col('boardId', 'TEXT', { notNull: true }),
      col('ownerId', 'TEXT', { notNull: true }),
      col('ownerKind', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['boardId']), unique(['ownerKind', 'ownerId'])],
  },
];
