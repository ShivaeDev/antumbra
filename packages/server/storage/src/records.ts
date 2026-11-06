import { Context, Effect, Layer } from "effect";
import { repository as agent } from "#records/agent.ts";
import { repository as agentReading } from "#records/agent-reading.ts";
import { repository as artifact } from "#records/artifact.ts";
import { repository as backendCatalog } from "#records/backend-catalog.ts";
import { repository as backendModel } from "#records/backend-model.ts";
import { repository as berth } from "#records/berth.ts";
import { repository as birth } from "#records/birth.ts";
import { repository as boardEntry } from "#records/board-entry.ts";
import { repository as capacity } from "#records/capacity.ts";
import { repository as captainReading } from "#records/captain-reading.ts";
import { repository as change } from "#records/change.ts";
import { repository as changeAdoptionRequest } from "#records/change-adoption-request.ts";
import { repository as changeFeedback } from "#records/change-feedback.ts";
import { repository as changeHostCapability } from "#records/change-host-capability.ts";
import { repository as changeRefresh } from "#records/change-refresh.ts";
import { repository as changeTransition } from "#records/change-transition.ts";
import { repository as changeVerdict } from "#records/change-verdict.ts";
import { repository as count } from "#records/count.ts";
import { repository as flag } from "#records/flag.ts";
import { repository as heldResource } from "#records/held-resource.ts";
import { repository as message } from "#records/message.ts";
import { repository as moorage } from "#records/moorage.ts";
import { repository as piece } from "#records/piece.ts";
import { repository as pieceAgent } from "#records/piece-agent.ts";
import { repository as pieceAssignmentWork } from "#records/piece-assignment-work.ts";
import { repository as pieceChange } from "#records/piece-change.ts";
import { repository as pieceChangeView } from "#records/piece-change-view.ts";
import { repository as pieceEdge } from "#records/piece-edge.ts";
import { repository as pieceOutcome } from "#records/piece-outcome.ts";
import { repository as pieceProgress } from "#records/piece-progress.ts";
import { repository as pieceReport } from "#records/piece-report.ts";
import { repository as pieceRulingGate } from "#records/piece-ruling-gate.ts";
import { repository as quayChange } from "#records/quay-change.ts";
import { repository as repo } from "#records/repo.ts";
import { repository as repoReference } from "#records/repo-reference.ts";
import { repository as report } from "#records/report.ts";
import { repository as resourceOwner } from "#records/resource-owner.ts";
import { repository as restart } from "#records/restart.ts";
import { repository as roleSetting } from "#records/role-setting.ts";
import { repository as ruling } from "#records/ruling.ts";
import { repository as rulingDisplay } from "#records/ruling-display.ts";
import { repository as rulingGate } from "#records/ruling-gate.ts";
import { repository as rulingNoticeReceipt } from "#records/ruling-notice-receipt.ts";
import { repository as session } from "#records/session.ts";
import { repository as sessionCapacityWait } from "#records/session-capacity-wait.ts";
import { repository as sessionEvent } from "#records/session-event.ts";
import { repository as sessionGap } from "#records/session-gap.ts";
import { repository as sessionInput } from "#records/session-input.ts";
import { repository as sessionNode } from "#records/session-node.ts";
import { repository as sessionOpening } from "#records/session-opening.ts";
import { repository as sessionOperation } from "#records/session-operation.ts";
import { repository as sessionSituation } from "#records/session-situation.ts";
import { repository as sessionStartResult } from "#records/session-start-result.ts";
import { repository as sessionToolCall } from "#records/session-tool-call.ts";
import { repository as sessionUsage } from "#records/session-usage.ts";
import { repository as smoothingAttempt } from "#records/smoothing-attempt.ts";
import { repository as smoothingSession } from "#records/smoothing-session.ts";
import { repository as stoppedLoop } from "#records/stopped-loop.ts";
import { repository as voyage } from "#records/voyage.ts";
import { repository as voyageActivity } from "#records/voyage-activity.ts";
import { repository as voyageAgent } from "#records/voyage-agent.ts";
import { repository as voyageCaptainWork } from "#records/voyage-captain-work.ts";
import { repository as voyagePieceProgress } from "#records/voyage-piece-progress.ts";
import { repository as voyageProgress } from "#records/voyage-progress.ts";

const create = Effect.gen(function* () {
	return {
		piece: yield* piece,
		pieceProgress: yield* pieceProgress,
		voyage: yield* voyage,
		agent: yield* agent,
		pieceAgent: yield* pieceAgent,
		session: yield* session,
		sessionOperation: yield* sessionOperation,
		birth: yield* birth,
		flag: yield* flag,
		message: yield* message,
		count: yield* count,
		voyageAgent: yield* voyageAgent,
		agentReading: yield* agentReading,
		smoothingAttempt: yield* smoothingAttempt,
		restart: yield* restart,
		roleSetting: yield* roleSetting,
		backendModel: yield* backendModel,
		backendCatalog: yield* backendCatalog,
		voyageActivity: yield* voyageActivity,
		voyagePieceProgress: yield* voyagePieceProgress,
		voyageCaptainWork: yield* voyageCaptainWork,
		voyageProgress: yield* voyageProgress,
		pieceOutcome: yield* pieceOutcome,
		pieceAssignmentWork: yield* pieceAssignmentWork,
		pieceRulingGate: yield* pieceRulingGate,
		pieceEdge: yield* pieceEdge,
		boardEntry: yield* boardEntry,
		smoothingSession: yield* smoothingSession,
		repo: yield* repo,
		repoReference: yield* repoReference,
		report: yield* report,
		pieceReport: yield* pieceReport,
		artifact: yield* artifact,
		capacity: yield* capacity,
		moorage: yield* moorage,
		berth: yield* berth,
		heldResource: yield* heldResource,
		resourceOwner: yield* resourceOwner,
		sessionCapacityWait: yield* sessionCapacityWait,
		sessionEvent: yield* sessionEvent,
		sessionUsage: yield* sessionUsage,
		sessionOpening: yield* sessionOpening,
		sessionToolCall: yield* sessionToolCall,
		sessionStartResult: yield* sessionStartResult,
		sessionNode: yield* sessionNode,
		sessionGap: yield* sessionGap,
		captainReading: yield* captainReading,
		sessionInput: yield* sessionInput,
		pieceChangeView: yield* pieceChangeView,
		changeHostCapability: yield* changeHostCapability,
		sessionSituation: yield* sessionSituation,
		changeRefresh: yield* changeRefresh,
		changeAdoptionRequest: yield* changeAdoptionRequest,
		quayChange: yield* quayChange,
		change: yield* change,
		pieceChange: yield* pieceChange,
		changeTransition: yield* changeTransition,
		changeVerdict: yield* changeVerdict,
		changeFeedback: yield* changeFeedback,
		ruling: yield* ruling,
		rulingNoticeReceipt: yield* rulingNoticeReceipt,
		rulingGate: yield* rulingGate,
		rulingDisplay: yield* rulingDisplay,
		stoppedLoop: yield* stoppedLoop,
	};
});
export class Records extends Context.Service<Records, Effect.Success<typeof create>>()("@antumbra/server-storage/Records") {
	static readonly layer = Layer.effect(Records, create);
}
