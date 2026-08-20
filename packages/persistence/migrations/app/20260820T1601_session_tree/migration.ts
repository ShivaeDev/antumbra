#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import {
  ADOPT_EXISTING_SESSIONS_AS_ROOTS,
  ONE_OPEN_ROOT_PER_AGENT,
  REJECT_INVALID_SESSION_STATUS,
  REJECT_ORPHAN_SESSION_EVENTS,
  REJECT_SECOND_OPEN_ROOT,
} from './guards.ts';
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { AGENT_SESSION_TABLE, SESSION_EVENT_TABLE } from './tables.ts';
import { Migration, MigrationCLI, dataTransform, rawSql } from '@prisma-next/sqlite/migration';

const INDEX_NAME = 'agentSession_one_open_root_per_agent';

const indexPresence = (description: string, sql: string) => ({
  description,
  sql,
  params: ['index', INDEX_NAME],
});

const nullableText = (name: string) => ({
  name,
  typeSql: 'TEXT',
  defaultSql: '',
  nullable: true,
});

const TREE_COLUMNS = [
  'outcome',
  'completeness',
  'label',
  'kind',
  'parentSessionId',
  'rootSessionId',
];

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      dataTransform({
        id: 'agentSession.tree.guard-session-status',
        label: 'Reject unknown Session lifecycle truth',
        table: 'agentSession',
        description: 'fail before backfill when a Session status is outside the durable vocabulary',
        run: () => REJECT_INVALID_SESSION_STATUS,
      }),
      ...TREE_COLUMNS.map((column) =>
        this.addColumn({ table: 'agentSession', column: nullableText(column) }),
      ),
      dataTransform({
        id: 'agentSession.tree.adopt-existing-as-roots',
        label: 'Adopt every existing Session as its own tree root',
        table: 'agentSession',
        description: 'root each surviving Session at itself and record its unaudited completeness',
        run: () => ADOPT_EXISTING_SESSIONS_AS_ROOTS,
      }),
      this.recreateTable({
        tableName: 'agentSession',
        ...AGENT_SESSION_TABLE,
        operationClass: 'destructive',
      }),
      dataTransform({
        id: 'sessionEvent.session.guard-orphans',
        label: 'Reject Session events with no Session',
        table: 'sessionEvent',
        description: 'fail before the foreign key adopts events whose Session is missing',
        run: () => REJECT_ORPHAN_SESSION_EVENTS,
      }),
      this.recreateTable({
        tableName: 'sessionEvent',
        ...SESSION_EVENT_TABLE,
        operationClass: 'destructive',
      }),
      dataTransform({
        id: 'agentSession.tree.guard-one-open-root',
        label: 'Reject Agents holding a second open root Session',
        table: 'agentSession',
        description: 'fail before the index when an Agent already owns two open root Sessions',
        run: () => REJECT_SECOND_OPEN_ROOT,
      }),
      rawSql({
        id: 'agentSession.tree.one-open-root-per-agent',
        label: 'Admit one open root Session per Agent',
        summary:
          'partial unique index over open root Sessions; PSL cannot express a filtered unique index',
        operationClass: 'additive',
        target: {
          id: 'sqlite',
          details: { schema: 'main', objectType: 'index', name: INDEX_NAME },
        },
        precheck: [
          indexPresence(
            `ensure index "${INDEX_NAME}" does not exist`,
            'SELECT COUNT(*) = 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
          ),
        ],
        execute: [
          {
            description: 'admit one open root Session per Agent',
            sql: ONE_OPEN_ROOT_PER_AGENT,
          },
        ],
        postcheck: [
          indexPresence(
            `verify index "${INDEX_NAME}" exists`,
            'SELECT COUNT(*) > 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
          ),
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
