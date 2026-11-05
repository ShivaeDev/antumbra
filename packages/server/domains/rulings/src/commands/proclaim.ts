import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { requestInput } from "#commands/inputs.ts";
import { subjectRows } from "#commands/request.ts";
import { rulingProclaimed } from "#facts/ruling-proclaimed.ts";
import { Subject } from "#rows/ruling.ts";
export const proclaim = command("proclaim", {
	input: {
		...requestInput,
		by: RulingAuthoritySchema,
		answer: titled(Schema.NonEmptyString, { title: "Your answer", multiline: true }),
		tags: titled(Schema.String, { title: "Tags" }),
		chosenChoice: Schema.NullOr(Schema.String),
	},
	reads: subjectRows,
	emits: rulingProclaimed,
	rejections: { SubjectMissing: { subject: Subject }, ChoiceUnknown: { choice: Schema.String }, OutsideAuthority: { radius: Schema.String } },
});
