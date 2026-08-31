import { Schema } from "effect";

export const ChangeStage = Schema.Literals(["prepared", "open", "landed", "withdrawn"]);
export type ChangeStage = typeof ChangeStage.Type;

export const ChangeChecks = Schema.Literals(["none", "pending", "green", "red"]);
export type ChangeChecks = typeof ChangeChecks.Type;

export const ChangeReview = Schema.Literals(["none", "pending", "approved", "changes_requested"]);
export type ChangeReview = typeof ChangeReview.Type;

export const ChangeMergeable = Schema.Literals(["unknown", "clean", "conflict"]);
export type ChangeMergeable = typeof ChangeMergeable.Type;

export const PieceChangePurpose = Schema.Literals(["depends_on", "produces", "reviews"]);
export type PieceChangePurpose = typeof PieceChangePurpose.Type;
