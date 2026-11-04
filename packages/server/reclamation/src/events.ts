import { berthHeld } from "@antumbra/domain-reclamation/facts/berth-held.ts";
import { berthReclaimFailed } from "@antumbra/domain-reclamation/facts/berth-reclaim-failed.ts";
import { berthReclaimed } from "@antumbra/domain-reclamation/facts/berth-reclaimed.ts";
import { mooragePlanned } from "@antumbra/domain-reclamation/facts/moorage-planned.ts";
import { moorageReady } from "@antumbra/domain-reclamation/facts/moorage-ready.ts";
import { resourcesClaimed } from "@antumbra/domain-reclamation/facts/resources-claimed.ts";
import { Schema } from "effect";
export const Events = Schema.Union([
	Schema.TaggedStruct("MooragePlanned", { ...mooragePlanned.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("MoorageReady", { ...moorageReady.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("ResourcesClaimed", { ...resourcesClaimed.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BerthReclaimed", { ...berthReclaimed.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BerthHeld", { ...berthHeld.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("BerthReclaimFailed", { ...berthReclaimFailed.payload, at: Schema.Number, sequence: Schema.Number }),
]);
