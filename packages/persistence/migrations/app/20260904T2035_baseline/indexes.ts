import { rawSql } from '@prisma-next/sqlite/migration';

export const INDEXES = [
  { table: 'agent', index: 'agent_status_idx', columns: ['status'] },
  { table: 'agentSession', index: 'agentSession_agentId_idx', columns: ['agentId'] },
  { table: 'agentSession', index: 'agentSession_parentSessionId_idx', columns: ['parentSessionId'] },
  { table: 'agentSession', index: 'agentSession_rootSessionId_status_idx', columns: ['rootSessionId', 'status'] },
  { table: 'agentSession', index: 'agentSession_rootSessionId_idx', columns: ['rootSessionId'] },
  { table: 'artifact', index: 'artifact_pieceId_idx', columns: ['pieceId'] },
  { table: 'berth', index: 'berth_agentId_idx', columns: ['agentId'] },
  { table: 'berth', index: 'berth_status_idx', columns: ['status'] },
  { table: 'boardEntry', index: 'boardEntry_boardId_idx', columns: ['boardId'] },
  { table: 'change', index: 'change_repoId_idx', columns: ['repoId'] },
  { table: 'change', index: 'change_host_externalId_idx', columns: ['host', 'externalId'] },
  { table: 'changeTransition', index: 'changeTransition_changeId_activityAt_idx', columns: ['changeId', 'activityAt'] },
  { table: 'intent', index: 'intent_status_idx', columns: ['status'] },
  { table: 'moorage', index: 'moorage_status_idx', columns: ['status'] },
  { table: 'pieceAgent', index: 'pieceAgent_agentId_idx', columns: ['agentId'] },
  { table: 'pieceChange', index: 'pieceChange_changeId_idx', columns: ['changeId'] },
  { table: 'pieceEdge', index: 'pieceEdge_toPieceId_idx', columns: ['toPieceId'] },
  { table: 'pieceReport', index: 'pieceReport_pieceId_idx', columns: ['pieceId'] },
  { table: 'pieceReport', index: 'pieceReport_reportId_idx', columns: ['reportId'] },
  { table: 'ruling', index: 'ruling_ruledAt_idx', columns: ['ruledAt'] },
  { table: 'ruling', index: 'ruling_supersededById_idx', columns: ['supersededById'] },
  { table: 'ruling', index: 'ruling_requesterAgentId_idx', columns: ['requesterAgentId'] },
  { table: 'ruling', index: 'ruling_ruledByAgentId_idx', columns: ['ruledByAgentId'] },
  { table: 'ruling', index: 'ruling_answerChoiceId_idx', columns: ['answerChoiceId'] },
  { table: 'rulingChoice', index: 'rulingChoice_rulingId_idx', columns: ['rulingId'] },
  { table: 'rulingGate', index: 'rulingGate_rulingId_idx', columns: ['rulingId'] },
  { table: 'rulingGate', index: 'rulingGate_pieceId_idx', columns: ['pieceId'] },
  { table: 'rulingReclassification', index: 'rulingReclassification_rulingId_idx', columns: ['rulingId'] },
  { table: 'rulingReclassification', index: 'rulingReclassification_byAgentId_idx', columns: ['byAgentId'] },
  { table: 'rulingSubject', index: 'rulingSubject_tag_idx', columns: ['tag'] },
  { table: 'rulingSubject', index: 'rulingSubject_rulingId_idx', columns: ['rulingId'] },
  { table: 'rulingSubject', index: 'rulingSubject_repoId_idx', columns: ['repoId'] },
  { table: 'rulingSubject', index: 'rulingSubject_voyageId_idx', columns: ['voyageId'] },
  { table: 'rulingSubject', index: 'rulingSubject_pieceId_idx', columns: ['pieceId'] },
  { table: 'rulingSubject', index: 'rulingSubject_agentId_idx', columns: ['agentId'] },
  { table: 'sessionEvent', index: 'sessionEvent_sessionId_idx', columns: ['sessionId'] },
  { table: 'sessionInput', index: 'sessionInput_sessionId_createdAt_idx', columns: ['sessionId', 'createdAt'] },
  { table: 'sessionInput', index: 'sessionInput_sessionId_idx', columns: ['sessionId'] },
  { table: 'sessionInputPart', index: 'sessionInputPart_attachmentId_idx', columns: ['attachmentId'] },
  { table: 'sessionInputPart', index: 'sessionInputPart_inputId_idx', columns: ['inputId'] },
  { table: 'voyageAgent', index: 'voyageAgent_agentId_idx', columns: ['agentId'] },
  { table: 'voyagePiece', index: 'voyagePiece_pieceId_idx', columns: ['pieceId'] },
];

const ONE_OPEN_ROOT_PER_AGENT = 'agentSession_one_open_root_per_agent';

const indexPresence = (description: string, sql: string) => ({
  description,
  sql,
  params: ['index', ONE_OPEN_ROOT_PER_AGENT],
});

export const ONE_OPEN_ROOT_PER_AGENT_INDEX = rawSql({
  id: 'agentSession.one-open-root-per-agent',
  label: 'Admit one open root Session per Agent',
  summary:
    'partial unique index over open root Sessions; PSL cannot express a filtered unique index',
  operationClass: 'additive',
  target: {
    id: 'sqlite',
    details: { schema: 'main', objectType: 'index', name: ONE_OPEN_ROOT_PER_AGENT },
  },
  precheck: [
    indexPresence(
      `ensure index "${ONE_OPEN_ROOT_PER_AGENT}" does not exist`,
      'SELECT COUNT(*) = 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
    ),
  ],
  execute: [
    {
      description: 'admit one open root Session per Agent',
      sql: `CREATE UNIQUE INDEX "${ONE_OPEN_ROOT_PER_AGENT}"
ON "agentSession" ("agentId", "status")
WHERE "parentSessionId" IS NULL AND "status" = 'open'`,
    },
  ],
  postcheck: [
    indexPresence(
      `verify index "${ONE_OPEN_ROOT_PER_AGENT}" exists`,
      'SELECT COUNT(*) > 0 AS "result" FROM "sqlite_master" WHERE ("type" = ? AND "name" = ?)',
    ),
  ],
});
