import { col, fn, foreignKey, lit, primaryKey, unique } from '@prisma-next/sqlite/migration';

export const VOYAGES_TABLES = [
  {
    table: 'voyage',
    columns: [
      col('captainBackend', 'TEXT', { notNull: true }),
      col('context', 'TEXT', { notNull: true }),
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('crewBackend', 'TEXT', { notNull: true }),
      col('focusedAt', 'TEXT'),
      col('id', 'TEXT', { notNull: true }),
      col('kind', 'TEXT', { notNull: true, default: lit('voyage') }),
      col('name', 'TEXT', { notNull: true }),
      col('northStar', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['id'])],
  },
  {
    table: 'voyageAgent',
    columns: [
      col('agentId', 'TEXT', { notNull: true }),
      col('role', 'TEXT', { notNull: true }),
      col('voyageId', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['voyageId', 'agentId'])],
  },
  {
    table: 'voyagePiece',
    columns: [
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('pieceId', 'TEXT', { notNull: true }),
      col('voyageId', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['voyageId', 'pieceId'])],
  },
  {
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
  },
  {
    table: 'pieceAgent',
    columns: [
      col('agentId', 'TEXT', { notNull: true }),
      col('assignedAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('pieceId', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['pieceId', 'agentId'])],
  },
  {
    table: 'pieceChange',
    columns: [
      col('changeId', 'TEXT', { notNull: true }),
      col('pieceId', 'TEXT', { notNull: true }),
      col('purpose', 'TEXT', { notNull: true, default: lit('produces') }),
    ],
    constraints: [primaryKey(['pieceId', 'changeId'])],
  },
  {
    table: 'pieceEdge',
    columns: [
      col('fromPieceId', 'TEXT', { notNull: true }),
      col('toPieceId', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['fromPieceId', 'toPieceId'])],
  },
  {
    table: 'pieceReport',
    columns: [
      col('pieceId', 'TEXT', { notNull: true }),
      col('reportId', 'TEXT', { notNull: true }),
    ],
    constraints: [
      primaryKey(['pieceId', 'reportId']),
      foreignKey(['pieceId'], 'piece', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
      foreignKey(['reportId'], 'report', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    ],
  },
  {
    table: 'pieceVerdict',
    columns: [
      col('landedAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('pieceId', 'TEXT', { notNull: true }),
      col('verdict', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['pieceId'])],
  },
  {
    table: 'artifact',
    columns: [
      col('authorAgentId', 'TEXT'),
      col('basename', 'TEXT', { notNull: true }),
      col('byteSize', 'INTEGER', { notNull: true }),
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('digest', 'TEXT', { notNull: true }),
      col('id', 'TEXT', { notNull: true }),
      col('pieceId', 'TEXT', { notNull: true }),
      col('supersededByArtifactId', 'TEXT'),
      col('title', 'TEXT', { notNull: true }),
    ],
    constraints: [
      primaryKey(['id']),
      unique(['supersededByArtifactId']),
      foreignKey(['pieceId'], 'piece', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
      foreignKey(['supersededByArtifactId'], 'artifact', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    ],
  },
  {
    table: 'report',
    columns: [
      col('authorAgentId', 'TEXT'),
      col('body', 'TEXT', { notNull: true }),
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('id', 'TEXT', { notNull: true }),
      col('title', 'TEXT', { notNull: true }),
    ],
    constraints: [primaryKey(['id'])],
  },
];
