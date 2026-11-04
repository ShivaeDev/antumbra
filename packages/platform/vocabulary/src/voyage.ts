import { Schema } from "effect";
import { VoyageAgentRoleSchema } from "#agent-role.ts";
import * as Id from "#id.ts";

export const VoyageKindSchema = Schema.Literals(["voyage", "flagship"]);
export type VoyageKind = typeof VoyageKindSchema.Type;

export const VoyageId = Id.brand("VoyageId");
export type VoyageId = typeof VoyageId.Type;

export const VoyageChoice = Schema.Struct({
	backend: Schema.NullOr(Schema.String),
	model: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
});

const core = {
	id: VoyageId,
	kind: VoyageKindSchema,
	name: Schema.String,
	northStar: Schema.String,
	context: Schema.String,
};

export const VoyageOpened = Schema.Struct({ ...core, openedAt: Schema.String, captain: VoyageChoice, crew: VoyageChoice });

export const VoyageFocusSet = Schema.Struct({ id: VoyageId, focusedAt: Schema.NullOr(Schema.String) });
export const VoyageQuietSet = Schema.Struct({ id: VoyageId, quietedAt: Schema.NullOr(Schema.String) });
export const Voyage = Schema.Struct({
	...core,
	focusedAt: VoyageFocusSet.fields.focusedAt,
	quietedAt: VoyageQuietSet.fields.quietedAt,
	openedAt: VoyageOpened.fields.openedAt,
});

export const VoyageEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.tag("VoyageOpened"), ...VoyageOpened.fields }),
	Schema.Struct({ _tag: Schema.tag("FocusSet"), ...VoyageFocusSet.fields }),
	Schema.Struct({ _tag: Schema.tag("QuietSet"), ...VoyageQuietSet.fields }),
]);

export const VoyageProgress = Schema.Struct({
	id: VoyageId,
	total: Schema.Number,
	counts: Schema.Struct({
		abandoned: Schema.Number,
		active: Schema.Number,
		blocked: Schema.Number,
		done: Schema.Number,
		held: Schema.Number,
		landing: Schema.Number,
		parked: Schema.Number,
		ready: Schema.Number,
	}),
	state: Schema.Literals(["quiet", "underWay"]),
	lastStirredAt: Schema.NullOr(Schema.String),
	concluded: Schema.Boolean,
});

export const VoyageRoleSetting = Schema.Struct({
	...VoyageChoice.fields,
	id: Schema.String,
	scope: VoyageId,
	role: VoyageAgentRoleSchema,
});

export const activityId = (sourceKind: "session" | "change", sourceId: string, voyageId: VoyageId): string =>
	JSON.stringify([sourceKind, sourceId, voyageId]);
