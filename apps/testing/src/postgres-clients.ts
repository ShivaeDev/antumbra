import { AgentsContract } from "@antumbra/server-agents/contract.ts";
import { ArtifactsContract } from "@antumbra/server-artifacts/contract.ts";
import { BackendsContract } from "@antumbra/server-backends/contract.ts";
import { BoardsContract } from "@antumbra/server-boards/contract.ts";
import { CapacityContract } from "@antumbra/server-capacity/contract.ts";
import { ChangesContract } from "@antumbra/server-changes/contract.ts";
import { CostsContract } from "@antumbra/server-costs/contract.ts";
import { HoldsContract } from "@antumbra/server-holds/contract.ts";
import { InputsContract } from "@antumbra/server-inputs/contract.ts";
import { LifecycleContract } from "@antumbra/server-lifecycle/contract.ts";
import { MailContract } from "@antumbra/server-mail/contract.ts";
import { PiecesContract } from "@antumbra/server-pieces/contract.ts";
import { ReclamationContract } from "@antumbra/server-reclamation/contract.ts";
import { ReportsContract } from "@antumbra/server-reports/contract.ts";
import { ReposContract } from "@antumbra/server-repos/contract.ts";
import { RoleSettingsContract } from "@antumbra/server-role-settings/contract.ts";
import { RulingsContract } from "@antumbra/server-rulings/contract.ts";
import { SessionsContract } from "@antumbra/server-sessions/contract.ts";
import { SettingsContract } from "@antumbra/server-settings/contract.ts";
import { ArtifactsHistory } from "@antumbra/server-storage/artifacts/service.ts";
import { BackendsHistory } from "@antumbra/server-storage/backends/service.ts";
import { BoardsHistory } from "@antumbra/server-storage/boards/service.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { InputsHistory } from "@antumbra/server-storage/inputs/service.ts";
import { MailHistory } from "@antumbra/server-storage/mail/service.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { ReportsHistory } from "@antumbra/server-storage/reports/service.ts";
import { ReposHistory } from "@antumbra/server-storage/repos/service.ts";
import { RoleSettingsHistory } from "@antumbra/server-storage/role-settings/service.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import { VoyageHistory } from "@antumbra/server-storage/voyages/service.ts";
import { SupervisionContract } from "@antumbra/server-supervision/contract.ts";
import { VoyagesContract } from "@antumbra/server-voyages/contract.ts";
import { Effect } from "effect";
import { RpcTest } from "effect/rpc";

export const postgresClients = Effect.fn("PostgresApp.clients")(function* () {
	const api = yield* RpcTest.makeClient(VoyagesContract.application);
	const history = yield* VoyageHistory;
	const pieceApi = yield* RpcTest.makeClient(PiecesContract.application);
	const mailApi = yield* RpcTest.makeClient(MailContract.application);
	const mailHistory = yield* MailHistory;

	const pieceHistory = yield* PieceHistory;
	const settingsApi = yield* RpcTest.makeClient(SettingsContract.application);
	const settingsHistory = yield* SettingsHistory;
	const backendsApi = yield* RpcTest.makeClient(BackendsContract.application);
	const backendsHistory = yield* BackendsHistory;
	const roleSettingsApi = yield* RpcTest.makeClient(RoleSettingsContract.application);
	const roleSettingsHistory = yield* RoleSettingsHistory;
	const boardsApi = yield* RpcTest.makeClient(BoardsContract.application);
	const boardsHistory = yield* BoardsHistory;
	const reposApi = yield* RpcTest.makeClient(ReposContract.application);
	const reposHistory = yield* ReposHistory;
	const artifactsApi = yield* RpcTest.makeClient(ArtifactsContract.application);
	const artifactsHistory = yield* ArtifactsHistory;
	const reportsApi = yield* RpcTest.makeClient(ReportsContract.application);
	const reportsHistory = yield* ReportsHistory;
	const inputsApi = yield* RpcTest.makeClient(InputsContract.application);
	const inputsHistory = yield* InputsHistory;
	const changesApi = yield* RpcTest.makeClient(ChangesContract.application);
	const changesHistory = yield* ChangesHistory;
	const sessionsApi = yield* RpcTest.makeClient(SessionsContract.application);
	const agentsApi = yield* RpcTest.makeClient(AgentsContract.application);
	const capacityApi = yield* RpcTest.makeClient(CapacityContract.application);
	const reclamationApi = yield* RpcTest.makeClient(ReclamationContract.application);
	const rulingsApi = yield* RpcTest.makeClient(RulingsContract.application);
	const lifecycleApi = yield* RpcTest.makeClient(LifecycleContract.application);
	const supervisionApi = yield* RpcTest.makeClient(SupervisionContract.application);
	const costsApi = yield* RpcTest.makeClient(CostsContract.application);
	const holdsApi = yield* RpcTest.makeClient(HoldsContract.application);
	const executionHistory = yield* ExecutionHistory;

	return {
		api: {
			...sessionsApi,
			...agentsApi,
			...capacityApi,
			...reclamationApi,
			...rulingsApi,
			...lifecycleApi,
			...supervisionApi,
			...costsApi,
			...holdsApi,
			...changesApi,
			...inputsApi,
			...reposApi,
			...artifactsApi,
			...reportsApi,
			...boardsApi,
			...api,
			...pieceApi,
			...mailApi,
			...settingsApi,
			...roleSettingsApi,
			...backendsApi,
		},
		history,
		pieceHistory,
		mailHistory,
		settingsHistory,
		backendsHistory,
		roleSettingsHistory,
		boardsHistory,
		reposHistory,
		artifactsHistory,
		reportsHistory,
		inputsHistory,
		changesHistory,
		executionHistory,
	};
});
