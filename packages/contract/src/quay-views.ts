import { Schema } from "effect";
import { ChangeView } from "#change-views.ts";

export const QuayGroup = Schema.Literals(["alongside", "checksRunning", "needsAttention", "draft"]);
export type QuayGroup = typeof QuayGroup.Type;

export const QuayRow = Schema.Struct({
	baseRef: Schema.String,
	body: Schema.String,
	change: ChangeView,
	group: QuayGroup,
	headRef: Schema.String,
	headSha: Schema.NullOr(Schema.String),
	originSessionId: Schema.NullOr(Schema.String),
	pieceId: Schema.String,
	pieceTitle: Schema.String,
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type QuayRow = typeof QuayRow.Type;

export const QuayPiece = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	voyageName: Schema.String,
});
export type QuayPiece = typeof QuayPiece.Type;

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
