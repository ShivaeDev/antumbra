import type { TranscriptNotice } from "@antumbra/domain-sessions/rows/transcript.ts";
import type { SubsessionGap } from "@antumbra/platform-vocabulary/session-events/subsessions.ts";

type GapKind = (typeof SubsessionGap.Type)["gapKind"];

const TITLES: Record<GapKind, string> = {
	"adopted-late": "this work was already speaking before anything named it",
	"append-failed": "an event could not be written to this record",
	"census-missing": "the count of this work never arrived",
	"spilled-preview": "a preview was larger than this record keeps",
	"stream-detached": "the stream stopped before this work reported an ending",
	unknown: "part of this work was not observed",
};

export const gapNotice = (event: typeof SubsessionGap.Type, seq: number): TranscriptNotice => ({
	detail: event.detail,
	kind: "notice",
	seq,
	title: TITLES[event.gapKind],
});
