import type { RuleRequest, RulingChoiceView, RulingView } from "@antumbra/contract";
import { Schema } from "effect";
import type { ReactNode } from "react";
import { useRequestForm } from "#adapters/form.ts";
import { ruleOn } from "#adapters/trpc-rulings.ts";
import { Badge } from "#components/ui/badge.tsx";
import { RequestForm } from "#forms/view.tsx";
import { cn } from "#lib/utils.ts";

const ChoiceOption = ({
	choice,
	chosen,
	onPick,
	reasoning,
}: {
	readonly choice: RulingChoiceView;
	readonly chosen: boolean;
	readonly onPick: () => void;
	readonly reasoning: string | null;
}) => (
	<button
		aria-pressed={chosen}
		className={cn(
			"flex min-w-0 flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
			chosen ? "border-info/40 bg-info/10" : "border-border hover:bg-secondary/50",
		)}
		onClick={onPick}
		type="button"
	>
		<span className="flex min-w-0 flex-wrap items-center gap-1.5">
			<span className="min-w-0 text-xs font-medium">{choice.label}</span>
			{reasoning === null ? null : <Badge variant="info">recommended</Badge>}
		</span>
		{choice.detail === null ? null : <span className="min-w-0 text-2xs text-muted-foreground">{choice.detail}</span>}
		{reasoning === null ? null : <span className="min-w-0 text-2xs">{reasoning}</span>}
	</button>
);

const recommendedFirst = (ruling: RulingView): ReadonlyArray<RulingChoiceView> => {
	const recommended = ruling.recommendation?.choiceId;
	return [...ruling.choices.filter((choice) => choice.id === recommended), ...ruling.choices.filter((choice) => choice.id !== recommended)];
};

const OfferedChoices = ({
	chosen,
	onPick,
	ruling,
}: {
	readonly chosen: string | undefined;
	readonly onPick: (choiceId: string | undefined) => void;
	readonly ruling: RulingView;
}) =>
	ruling.choices.length === 0 ? null : (
		<fieldset className="flex min-w-0 flex-col gap-1">
			<legend className="pb-1 text-2xs text-muted-foreground">Choices offered</legend>
			{recommendedFirst(ruling).map((choice) => (
				<ChoiceOption
					choice={choice}
					chosen={chosen === choice.id}
					key={choice.id}
					onPick={() => onPick(chosen === choice.id ? undefined : choice.id)}
					reasoning={ruling.recommendation?.choiceId === choice.id ? ruling.recommendation.reasoning : null}
				/>
			))}
		</fieldset>
	);

const verdictOf = (ruling: RulingView, answer: string, chosen: string | undefined): RuleRequest =>
	chosen === undefined ? { answer, rulingId: ruling.id } : { answer, choiceId: chosen, rulingId: ruling.id };

const answerSchema = Schema.Struct({ answer: Schema.String.check(Schema.isPattern(/\S/)), choiceId: Schema.UndefinedOr(Schema.String) });

const blankAnswer: typeof answerSchema.Type = { answer: "", choiceId: undefined };

export const RulingVerdict = ({ children, ruling }: { readonly children: ReactNode; readonly ruling: RulingView }) => {
	const form = useRequestForm({
		defaultValues: blankAnswer,
		schema: answerSchema,
		request: ({ answer, choiceId }) => ruleOn(verdictOf(ruling, answer, choiceId)),
		resetAfterSuccess: (value) => value,
		onSuccess: () => undefined,
	});
	return (
		<RequestForm form={form}>
			<form.AppField name="choiceId">
				{(field) => <OfferedChoices chosen={field.state.value} onPick={field.handleChange} ruling={ruling} />}
			</form.AppField>
			{children}
			<div className="flex flex-col gap-2 border-t border-border pt-2">
				<form.AppField name="answer">{(field) => <field.TextareaField label="Your answer" rows={2} />}</form.AppField>
				<form.Subscribe selector={(state) => state.values.answer.trim() === ""}>
					{(wordless) => (
						<form.Submit className="ml-auto" disabled={wordless} pending="Ruling…" size="sm">
							Rule
						</form.Submit>
					)}
				</form.Subscribe>
			</div>
		</RequestForm>
	);
};
