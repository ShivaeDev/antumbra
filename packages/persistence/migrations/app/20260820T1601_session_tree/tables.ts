const selfReference = (columns: readonly [string]) =>
  ({
    columns,
    references: { table: 'agentSession', columns: ['id'] },
    constraint: true,
    onDelete: 'restrict',
    onUpdate: 'restrict',
  }) as const;

const foreignKeyCheck = (table: string, from: string) =>
  ({
    description: `verify foreign key (${from}) → agentSession(id) on "${table}"`,
    sql: `SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('${table}') f WHERE f."table" = 'agentSession' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f."from", f."to") IN (('${from}', 'id')) THEN 1 ELSE 0 END) = 1)`,
  }) as const;

const text = (name: string, nullable: boolean) =>
  ({ name, typeSql: 'TEXT', defaultSql: '', nullable }) as const;

const textWithDefault = (name: string, defaultSql: string) =>
  ({ name, typeSql: 'TEXT', defaultSql, nullable: false }) as const;

export const AGENT_SESSION_TABLE = {
  contractTable: {
    columns: [
      text('agentId', false),
      textWithDefault('backend', "DEFAULT 'claude'"),
      text('charterDeliveredAt', true),
      textWithDefault('completeness', "DEFAULT 'recording'"),
      textWithDefault('createdAt', "DEFAULT (datetime('now'))"),
      text('cwd', false),
      textWithDefault('executionStatus', "DEFAULT 'active'"),
      text('id', false),
      text('kind', true),
      text('label', true),
      text('nativeRef', true),
      text('outcome', true),
      text('parentSessionId', true),
      text('rootSessionId', false),
      text('status', false),
    ],
    primaryKey: { columns: ['id'] },
    uniques: [],
    foreignKeys: [
      selfReference(['parentSessionId']),
      selfReference(['rootSessionId']),
    ],
  },
  schemaColumnNames: [
    'agentId',
    'backend',
    'charterDeliveredAt',
    'completeness',
    'createdAt',
    'cwd',
    'executionStatus',
    'id',
    'kind',
    'label',
    'nativeRef',
    'outcome',
    'parentSessionId',
    'rootSessionId',
    'status',
  ],
  indexes: [
    { name: 'agentSession_agentId_idx', columns: ['agentId'] },
    { name: 'agentSession_parentSessionId_idx', columns: ['parentSessionId'] },
    { name: 'agentSession_rootSessionId_idx', columns: ['rootSessionId'] },
    {
      name: 'agentSession_rootSessionId_status_idx',
      columns: ['rootSessionId', 'status'],
    },
  ],
  summary:
    'Recreates table agentSession to apply schema changes: database/agentSession/foreign-key:parentSessionId->.agentSession(id); database/agentSession/foreign-key:rootSessionId->.agentSession(id)',
  postchecks: [
    foreignKeyCheck('agentSession', 'parentSessionId'),
    foreignKeyCheck('agentSession', 'rootSessionId'),
  ],
} as const;

export const SESSION_EVENT_TABLE = {
  contractTable: {
    columns: [
      textWithDefault('at', "DEFAULT (datetime('now'))"),
      text('kind', false),
      text('payload', false),
      { name: 'seq', typeSql: 'INTEGER', defaultSql: '', nullable: false },
      text('sessionId', false),
    ],
    primaryKey: { columns: ['sessionId', 'seq'] },
    uniques: [],
    foreignKeys: [
      {
        columns: ['sessionId'],
        references: { table: 'agentSession', columns: ['id'] },
        constraint: true,
        onDelete: 'restrict',
        onUpdate: 'restrict',
      },
    ],
  },
  schemaColumnNames: ['at', 'kind', 'payload', 'seq', 'sessionId'],
  indexes: [{ name: 'sessionEvent_sessionId_idx', columns: ['sessionId'] }],
  summary:
    'Recreates table sessionEvent to apply schema changes: database/sessionEvent/foreign-key:sessionId->.agentSession(id)',
  postchecks: [foreignKeyCheck('sessionEvent', 'sessionId')],
} as const;
