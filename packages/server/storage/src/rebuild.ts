import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { ArtifactsHistory } from "#artifacts/service.ts";
import { BackendsHistory } from "#backends/service.ts";
import { BoardsHistory } from "#boards/service.ts";
import { ChangesHistory } from "#changes/service.ts";
import { ExecutionHistory } from "#execution/service.ts";
import { locked } from "#execution/write.ts";
import { MailHistory } from "#mail/service.ts";
import { PieceHistory } from "#pieces/service.ts";
import { ReportsHistory } from "#reports/service.ts";
import { ReposHistory } from "#repos/service.ts";
import { RoleSettingsHistory } from "#role-settings/service.ts";
import { SettingsHistory } from "#settings/service.ts";
import { VoyageHistory } from "#voyages/service.ts";

const tables = [
	"agent",
	"agentReading",
	"artifact",
	"backendCatalog",
	"backendModel",
	"berth",
	"birth",
	"boardEntry",
	"capacity",
	"captainReading",
	"change",
	"changeAdoptionRequest",
	"changeFeedback",
	"changeHostCapability",
	"changeRefresh",
	"changeTransition",
	"changeVerdict",
	"count",
	"flag",
	"heldResource",
	"message",
	"moorage",
	"piece",
	"pieceAgent",
	"pieceAssignmentWork",
	"pieceChange",
	"pieceChangeView",
	"pieceEdge",
	"pieceOutcome",
	"pieceProgress",
	"pieceReport",
	"pieceRulingGate",
	"quayChange",
	"repo",
	"repoReference",
	"report",
	"resourceOwner",
	"restart",
	"roleSetting",
	"ruling",
	"rulingDisplay",
	"rulingGate",
	"rulingNoticeReceipt",
	"session",
	"sessionCapacityWait",
	"sessionEvent",
	"sessionGap",
	"sessionInput",
	"sessionNode",
	"sessionOpening",
	"sessionOperation",
	"sessionSituation",
	"sessionStartResult",
	"sessionToolCall",
	"sessionUsage",
	"smoothingAttempt",
	"smoothingSession",
	"stoppedLoop",
	"voyage",
	"voyageActivity",
	"voyageAgent",
	"voyageCaptainWork",
	"voyagePieceProgress",
	"voyageProgress",
];

export const rebuild = Effect.fn("Postgres.rebuild")(function* () {
	const sql = yield* SqlClient.SqlClient;
	const mail = yield* MailHistory;
	const voyages = yield* VoyageHistory;
	const pieces = yield* PieceHistory;
	yield* locked(
		Effect.gen(function* () {
			yield* sql`truncate table ${sql.csv([sql`antumbra.voyage_roles`, ...tables.map((name) => sql`${sql(name)}`)])}`;
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
	);
});
