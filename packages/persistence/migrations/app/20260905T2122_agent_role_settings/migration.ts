#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  dataTransform,
  fn,
  primaryKey,
} from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        table: 'agentRoleSettings',
        columns: [
          col('backend', 'TEXT'),
          col('effort', 'TEXT'),
          col('model', 'TEXT'),
          col('role', 'TEXT', { notNull: true }),
          col('scope', 'TEXT', { notNull: true }),
          col('updatedAt', 'TEXT', { notNull: true, default: fn('now()') }),
        ],
        constraints: [primaryKey(['scope', 'role'])],
      }),
      dataTransform({
        id: 'data.agentRoleSettings.captain',
        label: 'Carry captain settings onto role rows',
        table: 'agentRoleSettings',
        description:
          "moves each voyage's captain settings to its own role row, and the flagship's to the fleet flagship role",
        run: () =>
          `INSERT INTO "agentRoleSettings" ("scope", "role", "backend", "model", "effort")
             SELECT
               CASE WHEN "kind" = 'flagship' THEN 'fleet' ELSE "id" END,
               CASE WHEN "kind" = 'flagship' THEN 'flagship' ELSE 'captain' END,
               "captainBackend",
               "captainModel",
               "captainEffort"
             FROM "voyage"`,
      }),
      dataTransform({
        id: 'data.agentRoleSettings.crew',
        label: 'Carry crew settings onto role rows',
        table: 'agentRoleSettings',
        description: "moves each voyage's crew settings to its own role row",
        run: () =>
          `INSERT INTO "agentRoleSettings" ("scope", "role", "backend", "model", "effort")
             SELECT "id", 'crew', "crewBackend", "crewModel", "crewEffort" FROM "voyage"`,
      }),
      this.dropColumn({ table: 'voyage', column: 'captainBackend' }),
      this.dropColumn({ table: 'voyage', column: 'captainEffort' }),
      this.dropColumn({ table: 'voyage', column: 'captainModel' }),
      this.dropColumn({ table: 'voyage', column: 'crewBackend' }),
      this.dropColumn({ table: 'voyage', column: 'crewEffort' }),
      this.dropColumn({ table: 'voyage', column: 'crewModel' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
