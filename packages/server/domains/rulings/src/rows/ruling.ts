import { row } from "@antumbra/platform-feature/row.ts";
import { RulingAuthoritySchema, RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";

export const Requester = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("agent"), agentId: Schema.String }),
	Schema.Struct({ kind: Schema.Literal("authority"), by: RulingAuthoritySchema }),
]);
export const Subject = Schema.Union([
	Schema.Struct({ kind: Schema.Literals(["repo", "voyage", "piece", "agent"]), id: Schema.String }),
	Schema.Struct({ kind: Schema.Literal("tag"), tag: Schema.String }),
]);
export const Choice = Schema.Struct({ id: Schema.String, label: Schema.String, detail: Schema.NullOr(Schema.String), position: Schema.Number });
export const Context = Schema.Struct({ id: Schema.String, authorAgentId: Schema.NullOr(Schema.String), body: Schema.String, at: Schema.String });
export const Reclassification = Schema.Struct({
	by: RulingAuthoritySchema,
	byAgentId: Schema.NullOr(Schema.String),
	radius: Schema.NullOr(RulingRadiusSchema),
	urgency: Schema.NullOr(RulingUrgencySchema),
	note: Schema.NullOr(Schema.String),
	at: Schema.String,
});
export const Answer = Schema.Struct({
	text: Schema.String,
	choiceId: Schema.NullOr(Schema.String),
	by: RulingAuthoritySchema,
	byAgentId: Schema.NullOr(Schema.String),
	at: Schema.String,
});
export const ruling = row(
	"ruling",
	{
		id: RulingId,
		requester: Requester,
		question: Schema.String,
		context: Schema.String,
		declaredRadius: RulingRadiusSchema,
		declaredUrgency: RulingUrgencySchema,
		radius: RulingRadiusSchema,
		urgency: RulingUrgencySchema,
		rung: Schema.NullOr(RulingAuthoritySchema),
		choices: Schema.Array(Choice),
		subjects: Schema.Array(Subject),
		contexts: Schema.Array(Context),
		reclassifications: Schema.Array(Reclassification),
		recommendation: Schema.NullOr(Schema.Struct({ choiceId: Schema.String, reasoning: Schema.String })),
		answer: Schema.NullOr(Answer),
		parked: Schema.NullOr(Schema.Struct({ note: Schema.String, at: Schema.String })),
		supersession: Schema.NullOr(Schema.Struct({ byRulingId: RulingId, by: RulingAuthoritySchema, at: Schema.String })),
		withdrawal: Schema.NullOr(Schema.Struct({ by: RulingAuthoritySchema, note: Schema.String, at: Schema.String })),
		deliveredAt: Schema.NullOr(Schema.String),
		createdAt: Schema.String,
	},
	{ key: "id" },
);
export type Ruling = typeof ruling.Row.Type;
