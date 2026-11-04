import { transact } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { ArtifactsHistory } from "#postgres/artifacts/service.ts";
import { BackendsHistory } from "#postgres/backends/service.ts";
import { BoardsHistory } from "#postgres/boards/service.ts";
import { ChangesHistory } from "#postgres/changes/service.ts";
import { ExecutionHistory } from "#postgres/execution/service.ts";
import { MailHistory } from "#postgres/mail/service.ts";
import { reset } from "#postgres/pieces/projection.ts";
import { PieceHistory } from "#postgres/pieces/service.ts";
import { ReportsHistory } from "#postgres/reports/service.ts";
import { ReposHistory } from "#postgres/repos/service.ts";
import { RoleSettingsHistory } from "#postgres/role-settings/service.ts";
import { SettingsHistory } from "#postgres/settings/service.ts";
import { VoyageHistory } from "#postgres/voyages/service.ts";

export const rebuild = Effect.fn("Postgres.rebuild")(function* () {
	const mail = yield* MailHistory;
	const voyages = yield* VoyageHistory;
	const pieces = yield* PieceHistory;
	yield* transact(
		Effect.gen(function* () {
			yield* reset;
			yield* voyages.rebuild();
			yield* pieces.rebuild();
			yield* mail.rebuild();
			yield* (yield* ReposHistory).rebuild();
			yield* (yield* ChangesHistory).rebuild();
			yield* (yield* ReportsHistory).rebuild();
			yield* (yield* ArtifactsHistory).rebuild();
			yield* (yield* BoardsHistory).rebuild();
			yield* (yield* RoleSettingsHistory).rebuild();
			yield* (yield* BackendsHistory).rebuild();
			yield* (yield* SettingsHistory).rebuild();
			yield* (yield* ExecutionHistory).rebuild();
		}),
		{ onSqlError: (error) => error },
	);
});
