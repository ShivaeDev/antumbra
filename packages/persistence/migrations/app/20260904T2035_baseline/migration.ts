#!/usr/bin/env -S node
import { AGENTS_TABLES } from './agents-tables.ts';
import { BOARDS_TABLES } from './boards-tables.ts';
import { CHANGES_TABLES } from './changes-tables.ts';
import type { Contract as End } from './end-contract';
import endContract from './end-contract.json' with { type: 'json' };
import { INDEXES, ONE_OPEN_ROOT_PER_AGENT_INDEX } from './indexes.ts';
import { RULINGS_TABLES } from './rulings-tables.ts';
import { SHELL_TABLES } from './shell-tables.ts';
import { VOYAGES_TABLES } from './voyages-tables.ts';
import { Migration, MigrationCLI } from '@prisma-next/sqlite/migration';

const TABLES = [...AGENTS_TABLES, ...VOYAGES_TABLES, ...CHANGES_TABLES, ...BOARDS_TABLES, ...SHELL_TABLES, ...RULINGS_TABLES];

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...TABLES.map((table) => this.createTable(table)),
      ...INDEXES.map((index) => this.createIndex(index)),
      ONE_OPEN_ROOT_PER_AGENT_INDEX,
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
