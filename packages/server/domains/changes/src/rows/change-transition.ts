import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeStage } from "@antumbra/platform-vocabulary/change.ts";
import { Schema } from "effect";
import { ChangeId } from "#ids.ts";
export const changeTransition = row("changeTransition", {id:Schema.String,changeId:ChangeId,fromStage:ChangeStage,toStage:ChangeStage,activityAt:Schema.String,observedAt:Schema.String}, {key:"id",scope:"changeId"});
