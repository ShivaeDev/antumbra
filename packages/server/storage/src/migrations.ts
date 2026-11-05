import { postgresMigration } from "@shivaedev/events/postgresMigration.ts";
import type { PostgresMigrationOptions } from "@shivaedev/sql/migrations.ts";
import { Effect } from "effect";
import { Migrator, SqlClient } from "effect/sql";
import { migration as agents } from "#agents/migration.ts";
import { migration as artifacts } from "#artifacts/migration.ts";
import { migration as backends } from "#backends/migration.ts";
import { migration as boards } from "#boards/migration.ts";
import { migration as capacity } from "#capacity/migration.ts";
import { migration as changes } from "#changes/migration.ts";
import { migration as execution } from "#execution/migration.ts";
import { migration as inputs } from "#inputs/migration.ts";
import { migration as lifecycle } from "#lifecycle/migration.ts";
import { migration as mail } from "#mail/migration.ts";
import { migration as pieces } from "#pieces/migration.ts";
import { migration as reclamation } from "#reclamation/migration.ts";
import { migration as reports } from "#reports/migration.ts";
import { migration as repos } from "#repos/migration.ts";
import { migration as rolesettings } from "#role-settings/migration.ts";
import { migration as rulings } from "#rulings/migration.ts";
import { migration as sessions } from "#sessions/migration.ts";
import { migration as settings } from "#settings/migration.ts";
import { migration as supervision } from "#supervision/migration.ts";
import { migration as voyages } from "#voyages/migration.ts";

export const migrations = {
	loader: Migrator.fromRecord({
		"1_storage_namespace": Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;
			yield* sql`create schema antumbra`;
		}),
		"2_events": postgresMigration,
		"3_voyages": voyages,
		"4_pieces": pieces,
		"5_mail": mail,
		"6_settings": settings,
		"7_backends": backends,
		"8_role_settings": rolesettings,
		"9_boards": boards,
		"10_repos": repos,
		"11_artifacts": artifacts,
		"12_reports": reports,
		"13_inputs": inputs,
		"14_changes": changes,
		"15_sessions": sessions,
		"16_agents": agents,
		"17_capacity": capacity,
		"18_reclamation": reclamation,
		"19_rulings": rulings,
		"20_lifecycle": lifecycle,
		"21_supervision": supervision,
		"22_execution": execution,
	}),
	lockTimeout: "5 seconds",
} satisfies PostgresMigrationOptions<never>;
