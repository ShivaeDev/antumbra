export {
	AGENT_BACKEND_TAGS,
	type AgentBackendTag,
} from "@antumbra/vocabulary/agent-backend";
// why: the composer and the transcript say the same words about an input that
// the capability storing it does, and the renderer already reads every other
// public word through this IDL. The Session-input subject is re-exported here
// so that stays one door rather than a second one into the vocabulary leaf.
export {
	MAX_SESSION_IMAGE_SOURCE_BYTES,
	MAX_SESSION_IMAGES,
	SessionInputId,
	type SessionMessagePart,
} from "@antumbra/vocabulary/session-input";
export { AppInfo, AppInfoSource } from "#app-info.ts";
export { ArtifactMarkdown, ArtifactView } from "#artifact-views.ts";
export { ChangeView } from "#change-views.ts";
export {
	type AntumbraBridge,
	type BridgeRequest,
	type BridgeSubscribeRequest,
	OPEN_EXTERNAL_CHANNEL,
	type SubscriptionMessage,
	subscriptionChannel,
	TRPC_CHANNEL,
	TRPC_FAILURE_CODES,
	TRPC_SUBSCRIBE_CHANNEL,
	TRPC_UNSUBSCRIBE_CHANNEL,
	type TrpcResponse,
} from "#channels.ts";
export {
	AgentSummary,
	AgentWork,
	BackendCapacitySummary,
	BerthSummary,
	Fleet,
	PieceWork,
	RepoSummary,
	SessionSummary,
	VoyageCommand,
} from "#fleet.ts";
export {
	SubscribeRequest,
	TrpcFailureCode,
	TrpcRequest,
	UnsubscribeRequest,
} from "#ipc.ts";
export {
	HostCapabilityView,
	QuayGroup,
	QuayPiece,
	QuayRow,
	QuayView,
} from "#quay-views.ts";
export { type AppRouter, makeAppRouter } from "#router.ts";
export { type RequestContext, RequestOrigin } from "#router-procedure.ts";
export * from "#rulings/surface.ts";
export {
	SessionImage,
	SessionImageRequest,
	SessionInputDraftPart,
	SessionInputReceipt,
	SessionInputRequest,
} from "#session-inputs.ts";
export { ChangeSituation, SessionSituation } from "#session-situations.ts";
export {
	SessionTree,
	SessionTreeNode,
	subsessionDisplayName,
	UNNAMED_SUBSESSION,
} from "#session-tree.ts";
export { SETTING_KEYS, SETTINGS, SettingKey } from "#settings/catalog.ts";
export {
	type SettingCount,
	type SettingDeclaration,
	SettingValue,
} from "#settings/declaration.ts";
export {
	SettingChange,
	SettingRefused,
	Settings,
	SettingsReading,
	SettingsSource,
} from "#settings/readings.ts";
export {
	EventQuery,
	RepoRegistration,
	SessionEvent,
	SightFailure,
	SightSource,
	SituationDraft,
	SpawnReceipt,
	SpawnRequest,
} from "#sight.ts";
export {
	AgentDiagnostics,
	FleetDiagnostics,
	IntentDiagnostic,
	SessionDiagnostics,
} from "#sight-diagnostics.ts";
export {
	AdoptChangeRequest,
	ArtifactSupersessionRequest,
	BoardTarget,
	BoardWriteRequest,
	CharterPieceRequest,
	CharterReceipt,
	CrewReceipt,
	DismissChangeRequest,
	HailReceipt,
	OpenVoyageRequest,
	PieceVerdictRequest,
	RewireRequest,
	VoyageBackendRequest,
} from "#voyage-requests.ts";
export {
	BoardEntryView,
	CrewMemberView,
	PieceAgentView,
	PieceCounts,
	PieceState,
	PieceView,
	ReportMarkdown,
	ReportView,
	VoyageCaptainView,
	VoyageState,
	VoyageSummary,
	VoyageView,
} from "#voyage-views.ts";
export { ArtifactMarkdownFailure, VoyageSource } from "#voyages.ts";
export {
	ArtifactPlace,
	ConsoleMode,
	ConsolePlace,
	TranscriptPlace,
	WindowPlace,
	WindowRefused,
	WindowSource,
} from "#windows.ts";
