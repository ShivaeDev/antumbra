import { Schema } from "effect";
import { ChangeView } from "#voyage-views.ts";

// why: the quay reads by where a change lies rather than by which host holds
// it — ready to merge, still running, wanting a hand, or not offered yet. The
// merge itself is done where the repo lives, so no group is a button.
export const QuayGroup = Schema.Literals([
	"alongside",
	"checksRunning",
	"needsAttention",
	"draft",
]);
export type QuayGroup = typeof QuayGroup.Type;

export const QuayRow = Schema.Struct({
	change: ChangeView,
	group: QuayGroup,
	pieceId: Schema.String,
	pieceTitle: Schema.String,
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type QuayRow = typeof QuayRow.Type;

// why: a change made by hand is adopted onto a piece that has none yet, so the
// pieces the quay offers are the fleet's, not the ones already on a row.
export const QuayPiece = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	voyageName: Schema.String,
});
export type QuayPiece = typeof QuayPiece.Type;

// why: what the host can do right now, in the host's own words — signed in as
// whom, or why not. The same sentence a refused act would have given back.
export const HostCapabilityView = Schema.Struct({
	available: Schema.Boolean,
	detail: Schema.String,
	tag: Schema.String,
});
export type HostCapabilityView = typeof HostCapabilityView.Type;

export const QuayView = Schema.Struct({
	hosts: Schema.Array(HostCapabilityView),
	pieces: Schema.Array(QuayPiece),
	rows: Schema.Array(QuayRow),
});
export type QuayView = typeof QuayView.Type;
