import { rulingAnswered } from "@antumbra/domain-rulings/facts/ruling-answered.ts";
import { rulingContextAdded } from "@antumbra/domain-rulings/facts/ruling-context-added.ts";
import { rulingDelivered } from "@antumbra/domain-rulings/facts/ruling-delivered.ts";
import { rulingGated } from "@antumbra/domain-rulings/facts/ruling-gated.ts";
import { rulingNoticeDelivered } from "@antumbra/domain-rulings/facts/ruling-notice-delivered.ts";
import { rulingParked } from "@antumbra/domain-rulings/facts/ruling-parked.ts";
import { rulingPassedUp } from "@antumbra/domain-rulings/facts/ruling-passed-up.ts";
import { rulingProclaimed } from "@antumbra/domain-rulings/facts/ruling-proclaimed.ts";
import { rulingReclassified } from "@antumbra/domain-rulings/facts/ruling-reclassified.ts";
import { rulingRequested } from "@antumbra/domain-rulings/facts/ruling-requested.ts";
import { rulingSuperseded } from "@antumbra/domain-rulings/facts/ruling-superseded.ts";
import { rulingWithdrawn } from "@antumbra/domain-rulings/facts/ruling-withdrawn.ts";
import { Schema } from "effect";
export const Events = Schema.Union([
	Schema.TaggedStruct("RulingNoticeDelivered", { ...rulingNoticeDelivered.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingAnswered", { ...rulingAnswered.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingContextAdded", { ...rulingContextAdded.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingDelivered", { ...rulingDelivered.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingGated", { ...rulingGated.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingParked", { ...rulingParked.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingPassedUp", { ...rulingPassedUp.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingProclaimed", { ...rulingProclaimed.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingReclassified", { ...rulingReclassified.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingRequested", { ...rulingRequested.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingSuperseded", { ...rulingSuperseded.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RulingWithdrawn", { ...rulingWithdrawn.payload, at: Schema.Number, sequence: Schema.Number }),
]);
