#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        table: 'ruling',
        column: { name: 'requesterAuthority', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.recreateTable({
        tableName: 'ruling',
        contractTable: {
          columns: [
            { name: 'answer', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'answerChoiceId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'context', typeSql: 'TEXT', defaultSql: '', nullable: false },
            {
              name: 'createdAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
            { name: 'deliveredAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'question', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'radius', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'requesterAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'requesterAuthority', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'ruledAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'ruledBy', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'supersededAt', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'supersededBy', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'supersededById', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'urgency', typeSql: 'TEXT', defaultSql: '', nullable: false },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [],
          foreignKeys: [
            {
              columns: ['requesterAgentId'],
              references: { table: 'agent', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
            {
              columns: ['answerChoiceId'],
              references: { table: 'rulingChoice', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
            {
              columns: ['supersededById'],
              references: { table: 'ruling', columns: ['id'] },
              constraint: true,
              onDelete: 'restrict',
              onUpdate: 'restrict',
            },
          ],
        },
        schemaColumnNames: [
          'answer',
          'answerChoiceId',
          'context',
          'createdAt',
          'deliveredAt',
          'id',
          'question',
          'radius',
          'requesterAgentId',
          'ruledAt',
          'ruledBy',
          'supersededAt',
          'supersededBy',
          'supersededById',
          'urgency',
        ],
        indexes: [
          { name: 'ruling_ruledAt_idx', columns: ['ruledAt'] },
          { name: 'ruling_supersededById_idx', columns: ['supersededById'] },
          { name: 'ruling_requesterAgentId_idx', columns: ['requesterAgentId'] },
          { name: 'ruling_answerChoiceId_idx', columns: ['answerChoiceId'] },
        ],
        summary:
          'Recreates table ruling to apply schema changes: database/ruling/column:requesterAgentId',
        postchecks: [
          {
            description: 'verify "requesterAgentId" nullability on "ruling"',
            sql: "SELECT COUNT(*) > 0 FROM pragma_table_info('ruling') WHERE name = 'requesterAgentId' AND \"notnull\" = 0",
          },
        ],
        operationClass: 'widening',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
