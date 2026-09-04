import { col, fn, foreignKey, primaryKey, unique } from '@prisma-next/sqlite/migration';

export const RULINGS_TABLES = [
  {
    table: 'ruling',
    columns: [
      col('answer', 'TEXT'),
      col('answerChoiceId', 'TEXT'),
      col('context', 'TEXT', { notNull: true }),
      col('createdAt', 'TEXT', { notNull: true, default: fn('now()') }),
      col('deliveredAt', 'TEXT'),
      col('id', 'TEXT', { notNull: true }),
      col('question', 'TEXT', { notNull: true }),
      col('radius', 'TEXT', { notNull: true }),
      col('requesterAgentId', 'TEXT'),
      col('requesterAuthority', 'TEXT'),
      col('ruledAt', 'TEXT'),
      col('ruledBy', 'TEXT'),
      col('ruledByAgentId', 'TEXT'),
      col('rung', 'TEXT'),
      col('supersededAt', 'TEXT'),
      col('supersededBy', 'TEXT'),
      col('supersededById', 'TEXT'),
      col('urgency', 'TEXT', { notNull: true }),
      col('withdrawnAt', 'TEXT'),
      col('withdrawnBy', 'TEXT'),
      col('withdrawnNote', 'TEXT'),
    ],
    constraints: [
      primaryKey(['id']),
      foreignKey(['requesterAgentId'], 'agent', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
      foreignKey(['ruledByAgentId'], 'agent', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
      foreignKey(['answerChoiceId'], 'rulingChoice', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
      foreignKey(['supersededById'], 'ruling', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    ],
  },
  {
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
  },
  {
    table: 'rulingGate',
    columns: [
      col('id', 'TEXT', { notNull: true }),
      col('pieceId', 'TEXT', { notNull: true }),
      col('rulingId', 'TEXT', { notNull: true }),
    ],
    constraints: [
      primaryKey(['id']),
      unique(['rulingId', 'pieceId']),
      foreignKey(['rulingId'], 'ruling', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
      foreignKey(['pieceId'], 'piece', ['id'], { onDelete: 'restrict', onUpdate: 'restrict' }),
    ],
  },
  {
    table: 'rulingReclassification',
    columns: [
      col('at', 'TEXT', { notNull: true }),
      col('by', 'TEXT', { notNull: true }),
      col('byAgentId', 'TEXT'),
      col('id', 'TEXT', { notNull: true }),
      col('note', 'TEXT'),
      col('radius', 'TEXT'),
      col('rulingId', 'TEXT', { notNull: true }),
      col('urgency', 'TEXT'),
    ],
    constraints: [
      primaryKey(['id']),
      foreignKey(['rulingId'], 'ruling', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
      foreignKey(['byAgentId'], 'agent', ['id'], {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    ],
  },
  {
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
  },
];
