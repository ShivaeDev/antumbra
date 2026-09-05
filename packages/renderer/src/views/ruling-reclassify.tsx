import type { ReclassifyRequest, RulingView } from "@antumbra/contract";
import { useState } from "react";
import { reclassifyRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { rulingRadii, rulingUrgencies } from "#rulings/labels.ts";
import { LabelledField } from "#views/field.tsx";
import { AxisSelect } from "#views/ruling-axis-select.tsx";

const requestOf = (ruling: RulingView, radius: RulingView["radius"], urgency: RulingView["urgency"], note: string): ReclassifyRequest => ({
	rulingId: ruling.id,
	...(note.trim() === "" ? {} : { note: note.trim() }),
	...(radius === ruling.radius ? {} : { radius }),
	...(urgency === ruling.urgency ? {} : { urgency }),
});

export const RulingReclassify = ({ onError, ruling }: { readonly onError: (message: string) => void; readonly ruling: RulingView }) => {
	const [radius, setRadius] = useState(ruling.radius);
	const [urgency, setUrgency] = useState(ruling.urgency);
	const [note, setNote] = useState("");
	const unmoved = radius === ruling.radius && urgency === ruling.urgency;
	return (
		<div className="flex min-w-0 flex-wrap items-end gap-2">
			<LabelledField label="Radius">{(id) => <AxisSelect id={id} onChange={setRadius} value={radius} words={rulingRadii} />}</LabelledField>
			<LabelledField label="Urgency">{(id) => <AxisSelect id={id} onChange={setUrgency} value={urgency} words={rulingUrgencies} />}</LabelledField>
			<div className="min-w-32 flex-1">
				<LabelledField label="Why">{(id) => <Input id={id} onChange={(event) => setNote(event.target.value)} value={note} />}</LabelledField>
			</div>
			<Button
				disabled={unmoved}
				onClick={() => reclassifyRuling(requestOf(ruling, radius, urgency, note), onError)}
				size="sm"
				type="button"
				variant="outline"
			>
				Reclassify
			</Button>
		</div>
	);
};
