import type { RuleRequest, RulingChoiceView, RulingView } from "@antumbra/contract";
import { useState } from "react";
import { ruleOn } from "#adapters/trpc-rulings.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { cn } from "#lib/utils.ts";
import { LabelledField } from "#views/field.tsx";

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

export const OfferedChoices = ({
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

export const RulingVerdict = ({
	chosen,
	onError,
	ruling,
}: {
	readonly chosen: string | undefined;
	readonly onError: (message: string) => void;
	readonly ruling: RulingView;
}) => {
	const [answer, setAnswer] = useState("");
	const wordless = answer.trim() === "";
	return (
		<div className="flex min-w-0 flex-col gap-2 border-t border-border pt-2">
			<LabelledField label="Your answer">
				{(id) => <Textarea id={id} onChange={(event) => setAnswer(event.target.value)} rows={2} value={answer} />}
			</LabelledField>
			<Button className="ml-auto" disabled={wordless} onClick={() => ruleOn(verdictOf(ruling, answer, chosen), onError)} size="sm" type="button">
				Rule
			</Button>
		</div>
	);
};
