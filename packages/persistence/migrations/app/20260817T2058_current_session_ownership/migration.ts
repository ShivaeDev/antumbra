#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, dataTransform } from '@prisma-next/sqlite/migration';

const ASSIGN_NEWEST_OPEN_SESSION = `UPDATE "agent" SET "currentSessionId" = (
  SELECT "id" FROM "agentSession"
  WHERE "agentSession"."agentId" = "agent"."id"
    AND "agentSession"."status" = 'open'
  ORDER BY "agentSession"."createdAt" DESC, "agentSession"."id" DESC
  LIMIT 1
)
WHERE "agent"."status" IN ('spawning', 'alive')`;

const CLOSE_NON_CURRENT_SESSIONS = `UPDATE "agentSession" SET "status" = 'closed'
WHERE "agentSession"."status" = 'open'
  AND (
    EXISTS (
      SELECT 1 FROM "agent"
      WHERE "agent"."id" = "agentSession"."agentId"
        AND "agent"."status" IN ('dormant', 'retired')
    )
    OR EXISTS (
      SELECT 1 FROM "agent"
      WHERE "agent"."id" = "agentSession"."agentId"
        AND "agent"."currentSessionId" IS NOT "agentSession"."id"
    )
  )`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        table: 'agent',
        column: { name: 'currentSessionId', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      dataTransform({
        id: 'agent.currentSessionId.backfill',
        label: 'Select each Agent current Session',
        table: 'agent',
        description: 'select newest open Session by (createdAt DESC, id DESC)',
        run: () => ASSIGN_NEWEST_OPEN_SESSION,
      }),
      dataTransform({
        id: 'agentSession.current.close-others',
        label: 'Close non-current Agent Sessions',
        table: 'agentSession',
        description: 'close open Sessions not selected as current',
        run: () => CLOSE_NON_CURRENT_SESSIONS,
      }),
      this.recreateTable({
        tableName: 'agent',
        contractTable: {
          columns: [
            { name: 'charter', typeSql: 'TEXT', defaultSql: '', nullable: false },
            {
              name: 'createdAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
            { name: 'currentSessionId', typeSql: 'TEXT', defaultSql: '', nullable: true },
            { name: 'id', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'role', typeSql: 'TEXT', defaultSql: '', nullable: false },
            { name: 'status', typeSql: 'TEXT', defaultSql: '', nullable: false },
            {
              name: 'updatedAt',
              typeSql: 'TEXT',
              defaultSql: "DEFAULT (datetime('now'))",
              nullable: false,
            },
          ],
          primaryKey: { columns: ['id'] },
          uniques: [{ columns: ['currentSessionId'] }],
          foreignKeys: [],
        },
        schemaColumnNames: [
          'charter',
          'createdAt',
          'currentSessionId',
          'id',
          'role',
          'status',
          'updatedAt',
        ],
        indexes: [{ name: 'agent_status_idx', columns: ['status'] }],
        summary:
          'Recreates table agent to apply schema changes: database/agent/unique:currentSessionId',
        postchecks: [
          {
            description: 'verify unique constraint (currentSessionId) on "agent"',
            sql: "SELECT EXISTS (SELECT 1 FROM pragma_index_list('agent') l WHERE l.\"unique\" = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name)) = 1 AND (SELECT COUNT(*) FROM pragma_index_info(l.name) WHERE name IN ('currentSessionId')) = 1)",
          },
        ],
        operationClass: 'destructive',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
