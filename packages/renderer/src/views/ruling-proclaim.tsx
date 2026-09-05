import type { ProclaimRequest } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { Schema } from "effect";
import { ScrollTextIcon } from "lucide-react";
import { useState } from "react";
import { useRequestForm } from "#adapters/form.ts";
import { proclaimRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { RequestForm } from "#forms/view.tsx";
import { axisSchema, defaultAxes, RulingAxisFields } from "#views/ruling-axis-fields.tsx";

const requiredText = Schema.String.check(Schema.isPattern(/\S/));
const draftSchema = Schema.Struct({ ...axisSchema.fields, answer: requiredText, context: requiredText, question: requiredText, tags: Schema.String });
const blank: typeof draftSchema.Type = { ...defaultAxes, answer: "", context: "", question: "", tags: "" };

const tagsOf = (written: string): ReadonlyArray<string> =>
	written
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => tag !== "");

const proclamationOf = (written: typeof draftSchema.Type): ProclaimRequest => {
	const tags = tagsOf(written.tags);
	return {
		answer: written.answer.trim(),
		context: written.context.trim(),
		question: written.question.trim(),
		radius: written.radius,
		urgency: written.urgency,
		...(tags.length === 0 ? {} : { tags }),
	};
};

export const RulingProclaim = () => {
	const [open, setOpen] = useState(false);
	const form = useRequestForm({
		defaultValues: blank,
		schema: draftSchema,
		request: (value) => proclaimRuling(proclamationOf(value)),
		resetAfterSuccess: () => blank,
		onSuccess: () => setOpen(false),
	});
	const unwritten = useStore(form.store, (state) =>
		[state.values.question, state.values.context, state.values.answer].some((text) => text.trim() === ""),
	);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm" type="button" variant="outline">
					<ScrollTextIcon />
					Proclaim a ruling
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Proclaim a ruling</DialogTitle>
					<DialogDescription>
						A rule of your own stands at once. Write the context a reader will need long after the work that prompted it.
					</DialogDescription>
				</DialogHeader>
				<RequestForm form={form}>
					<form.AppField name="question">{(field) => <field.TextField label="Question" />}</form.AppField>
					<form.AppField name="context">{(field) => <field.TextareaField label="Context" />}</form.AppField>
					<form.AppField name="answer">{(field) => <field.TextareaField label="Your answer" />}</form.AppField>
					<form.AppField name="tags">{(field) => <field.TextField label="Tags" />}</form.AppField>
					<div className="flex min-w-0 flex-wrap items-end gap-2">
						<RulingAxisFields form={form} fields={{ radius: "radius", urgency: "urgency" }} />
					</div>
					<DialogFooter>
						<form.Submit disabled={unwritten} pending="Proclaiming…">
							Proclaim
						</form.Submit>
					</DialogFooter>
				</RequestForm>
			</DialogContent>
		</Dialog>
	);
};
