// why: the lanes are the half of this backend that runs without a provider
// process. The composition root drives them over a scripted delivery script —
// stream frames and mirrored transcripts alike — to hold the whole acquisition
// path (tree rows, journals, gaps) to a real provider shape at zero model
// tokens, which is what simulability asks of a backend.
export { claudePlugin } from "#plugin.ts";
export {
	type Delivery,
	laneEvents,
	type MirrorWrite,
	openSessionLanes,
	type SessionLanes,
} from "#session-lanes.ts";
export {
	censusFindings,
	censusUnreadable,
	transcriptFindings,
} from "#subsession-audit.ts";
export type { AdoptedAgent, Repair } from "#workflow-adoption.ts";
