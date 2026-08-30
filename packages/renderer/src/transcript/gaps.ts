import type { SubsessionGap } from "@antumbra/vocabulary/session-events";
import type { TranscriptNotice } from "#transcript/model.ts";

type GapKind = (typeof SubsessionGap.Type)["gapKind"];

// why: what each gap means in words rather than in the vocabulary's token. A
// gap is the record saying where it stopped seeing, so every line says that and
// nothing more — read as a failure it would send someone looking for a break
// that is not there.
const TITLES: Record<GapKind, string> = {
	"adopted-late": "this work was already speaking before anything named it",
	"append-failed": "an event could not be written to this record",
	"census-missing": "the count of this work never arrived",
	"read-truncated": "part of a stored read was not kept",
	"sidecar-absent": "nothing was recording for part of this work",
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
