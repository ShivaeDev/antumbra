#!/usr/bin/env -S node
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import { RECLASSIFICATION_TABLE } from './reclassification-table.ts';
import { PLACE_OPEN_RULINGS_ON_THEIR_RUNG } from './rungs.ts';
import { RULING_TABLE } from './ruling-table.ts';
import type { Contract as Start } from './start-contract';
import startContract from './start-contract.json' with { type: 'json' };
import { Migration, MigrationCLI, dataTransform } from '@prisma-next/sqlite/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        table: 'ruling',
        column: { name: 'ruledByAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'ruling',
        column: { name: 'rung', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.addColumn({
        table: 'rulingReclassification',
        column: { name: 'byAgentId', typeSql: 'TEXT', defaultSql: '', nullable: true },
      }),
      this.createIndex({
        table: 'ruling',
        index: 'ruling_ruledByAgentId_idx',
        columns: ['ruledByAgentId'],
      }),
      this.createIndex({
        table: 'rulingReclassification',
        index: 'rulingReclassification_byAgentId_idx',
        columns: ['byAgentId'],
      }),
      this.recreateTable(RULING_TABLE),
      dataTransform({
        id: 'ruling.rung.place-open-rulings',
        label: 'Place every open ruling on the rung its asker waits on',
        table: 'ruling',
        description:
          'read the rung off the asker the way a new request does, so no open ruling waits on nobody',
        run: () => PLACE_OPEN_RULINGS_ON_THEIR_RUNG,
      }),
      this.recreateTable(RECLASSIFICATION_TABLE),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
