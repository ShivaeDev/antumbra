import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { RulingAuthoritySchema, RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { Requester, Subject } from "#rows/ruling.ts";
export const ChoiceInput = Schema.Struct({ label: Schema.NonEmptyString, detail: Schema.optional(Schema.String) });
export const requestInput = {
	context: titled(Schema.NonEmptyString, { title: "Context", multiline: true }),
	question: titled(Schema.NonEmptyString, { title: "Question", multiline: true }),
	radius: titled(RulingRadiusSchema, { title: "Radius" }),
	urgency: titled(RulingUrgencySchema, { title: "Urgency" }),
	choices: Schema.Array(ChoiceInput),
	subjects: Schema.Array(Subject),
};
export const askedInput = {
	...requestInput,
	requester: Requester,
	rung: Schema.NullOr(RulingAuthoritySchema),
	gates: Schema.Array(PieceId),
	recommendation: Schema.NullOr(Schema.Struct({ choice: Schema.String, reasoning: Schema.String })),
};
