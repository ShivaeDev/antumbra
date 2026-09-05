import type { ProclaimRequest, RulingView } from "@antumbra/contract";
import { ScrollTextIcon } from "lucide-react";
import { useState } from "react";
import { proclaimRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
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

const unwritten = (written: Written): boolean => written.answer.trim() === "" || written.context.trim() === "" || written.question.trim() === "";

export const RulingProclaim = ({ onError }: { readonly onError: (message: string) => void }) => {
	const [open, setOpen] = useState(false);
	const [written, setWritten] = useState(BLANK);
	const write = <Key extends keyof Written>(key: Key, value: Written[Key]) => setWritten((current) => ({ ...current, [key]: value }));
	const proclaim = () =>
		proclaimRuling(
			proclamationOf(written),
			() => {
				setWritten(BLANK);
				setOpen(false);
			},
			onError,
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
				<LabelledField label="Question">
					{(id) => <Input id={id} onChange={(event) => write("question", event.target.value)} value={written.question} />}
				</LabelledField>
				<LabelledField label="Context">
					{(id) => <Textarea id={id} onChange={(event) => write("context", event.target.value)} rows={3} value={written.context} />}
				</LabelledField>
				<LabelledField label="Your answer">
					{(id) => <Textarea id={id} onChange={(event) => write("answer", event.target.value)} rows={3} value={written.answer} />}
				</LabelledField>
				<LabelledField label="Tags">
					{(id) => <Input id={id} onChange={(event) => write("tags", event.target.value)} value={written.tags} />}
				</LabelledField>
				<div className="flex min-w-0 flex-wrap items-end gap-2">
					<LabelledField label="Radius">
						{(id) => <AxisSelect id={id} onChange={(word) => write("radius", word)} value={written.radius} words={rulingRadii} />}
					</LabelledField>
					<LabelledField label="Urgency">
						{(id) => <AxisSelect id={id} onChange={(word) => write("urgency", word)} value={written.urgency} words={rulingUrgencies} />}
					</LabelledField>
				</div>
				<DialogFooter>
					<Button disabled={unwritten(written)} onClick={proclaim} type="button">
						Proclaim
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
