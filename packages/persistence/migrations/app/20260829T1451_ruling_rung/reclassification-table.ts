export const RECLASSIFICATION_TABLE = {
  tableName: 'rulingReclassification',
  contractTable: {
    columns: [
      { name: 'at', typeSql: 'TEXT', defaultSql: '', nullable: false },
      { name: 'by', typeSql: 'TEXT', defaultSql: '', nullable: false },
      { name: 'byAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
      { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
      { name: 'note', typeSql: 'TEXT', defaultSql: '', nullable: true },
      { name: 'radius', typeSql: 'TEXT', defaultSql: '', nullable: true },
      { name: 'rulingId', typeSql: 'TEXT', defaultSql: '', nullable: false },
      { name: 'urgency', typeSql: 'TEXT', defaultSql: '', nullable: true },
    ],
    primaryKey: { columns: ['id'] },
    uniques: [],
    foreignKeys: [
      {
        columns: ['rulingId'],
        references: { table: 'ruling', columns: ['id'] },
        constraint: true,
        onDelete: 'restrict',
        onUpdate: 'restrict',
      },
      {
        columns: ['byAgentId'],
        references: { table: 'agent', columns: ['id'] },
        constraint: true,
        onDelete: 'restrict',
        onUpdate: 'restrict',
      },
    ],
  },
  schemaColumnNames: ['at', 'by', 'id', 'note', 'radius', 'rulingId', 'urgency'],
  indexes: [
    { name: 'rulingReclassification_rulingId_idx', columns: ['rulingId'] },
    { name: 'rulingReclassification_byAgentId_idx', columns: ['byAgentId'] },
  ],
  summary:
    'Recreates table rulingReclassification to apply schema changes: database/rulingReclassification/foreign-key:byAgentId->.agent(id)',
  postchecks: [
    {
      description: 'verify foreign key (rulingId) → ruling(id) on "rulingReclassification"',
      sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingReclassification') f WHERE f.\"table\" = 'ruling' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('rulingId', 'id')) THEN 1 ELSE 0 END) = 1)",
    },
    {
      description: 'verify foreign key (byAgentId) → agent(id) on "rulingReclassification"',
      sql: "SELECT EXISTS (SELECT 1 FROM pragma_foreign_key_list('rulingReclassification') f WHERE f.\"table\" = 'agent' GROUP BY f.id HAVING COUNT(*) = 1 AND SUM(CASE WHEN (f.\"from\", f.\"to\") IN (('byAgentId', 'id')) THEN 1 ELSE 0 END) = 1)",
    },
  ],
  operationClass: 'destructive',
};
