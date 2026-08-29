import type { ProclaimRequest, RulingView } from "@antumbra/contract";
import { useState } from "react";
import { proclaimRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { rulingRadii, rulingUrgencies } from "#rulings/labels.ts";
import { LabelledField } from "#views/field.tsx";
import { AxisSelect } from "#views/ruling-axis-select.tsx";

interface Written {
	readonly answer: string;
	readonly context: string;
	readonly question: string;
	readonly radius: RulingView["radius"];
	readonly tags: string;
	readonly urgency: RulingView["urgency"];
}

const BLANK: Written = {
	answer: "",
	context: "",
	question: "",
	radius: "fleet",
	tags: "",
	urgency: "eventual",
};

const tagsOf = (written: string): ReadonlyArray<string> =>
	written
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => tag !== "");

// why: a rule the admiral writes for itself carries the same context and
// question an agent's request would, because the answer is read long after
// both and binds nothing without them.
const proclamationOf = (written: Written): ProclaimRequest => {
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

const unwritten = (written: Written): boolean =>
	written.answer.trim() === "" ||
	written.context.trim() === "" ||
	written.question.trim() === "";

// why: the admiral's own rule is asked and answered in one act, so the form
// takes the whole record at once and the ruling stands the moment it lands.
export const RulingProclaim = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [written, setWritten] = useState(BLANK);
	const write = <Key extends keyof Written>(key: Key, value: Written[Key]) =>
		setWritten((current) => ({ ...current, [key]: value }));
	return (
		<section className="flex min-w-0 flex-col gap-2 border-b border-border px-4 py-3">
			<h3 className="text-sm font-medium">Proclaim a ruling</h3>
			<p className="text-2xs text-muted-foreground">
				A rule of your own stands at once. Write the context a reader will need
				long after the work that prompted it.
			</p>
			<LabelledField label="Question">
				{(id) => (
					<Input
						id={id}
						onChange={(event) => write("question", event.target.value)}
						value={written.question}
					/>
				)}
			</LabelledField>
			<LabelledField label="Context">
				{(id) => (
					<Textarea
						id={id}
						onChange={(event) => write("context", event.target.value)}
						rows={2}
						value={written.context}
					/>
				)}
			</LabelledField>
			<LabelledField label="Your answer">
				{(id) => (
					<Textarea
						id={id}
						onChange={(event) => write("answer", event.target.value)}
						rows={2}
						value={written.answer}
					/>
				)}
			</LabelledField>
			<LabelledField label="Tags">
				{(id) => (
					<Input
						id={id}
						onChange={(event) => write("tags", event.target.value)}
						value={written.tags}
					/>
				)}
			</LabelledField>
			<div className="flex min-w-0 flex-wrap items-end gap-2">
				<LabelledField label="Radius">
					{(id) => (
						<AxisSelect
							id={id}
							onChange={(word) => write("radius", word)}
							value={written.radius}
							words={rulingRadii}
						/>
					)}
				</LabelledField>
				<LabelledField label="Urgency">
					{(id) => (
						<AxisSelect
							id={id}
							onChange={(word) => write("urgency", word)}
							value={written.urgency}
							words={rulingUrgencies}
						/>
					)}
				</LabelledField>
				<Button
					disabled={unwritten(written)}
					onClick={() => {
						proclaimRuling(proclamationOf(written), onError);
						setWritten(BLANK);
					}}
					size="sm"
					type="button"
				>
					Proclaim
				</Button>
			</div>
		</section>
	);
};
