import type { VoyageAgentRole } from "@antumbra/contract";
import { useState } from "react";
import { setAgentSettings } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { LabelledField } from "#views/field.tsx";

const chosen = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export const AgentSettingsEditor = ({
	agentRole,
	effort,
	label,
	model,
	onError,
	voyageId,
}: {
	readonly agentRole: VoyageAgentRole;
	readonly effort: string | null;
	readonly label: string;
	readonly model: string | null;
	readonly onError: (message: string) => void;
	readonly voyageId: string;
}) => {
	const [nextModel, setModel] = useState(model ?? "");
	const [nextEffort, setEffort] = useState(effort ?? "");
	const unmoved = chosen(nextModel) === model && chosen(nextEffort) === effort;
	return (
		<div className="flex min-w-0 flex-wrap items-end gap-2">
			<div className="min-w-40 flex-1">
				<LabelledField label={`${label} model`}>
					{(id) => <Input id={id} onChange={(event) => setModel(event.target.value)} placeholder="the backend's own" value={nextModel} />}
				</LabelledField>
			</div>
			<div className="min-w-24">
				<LabelledField label={`${label} effort`}>
					{(id) => <Input id={id} onChange={(event) => setEffort(event.target.value)} placeholder="the backend's own" value={nextEffort} />}
				</LabelledField>
			</div>
			<Button
				disabled={unmoved}
				onClick={() => setAgentSettings({ effort: chosen(nextEffort), model: chosen(nextModel), role: agentRole, voyageId }, onError)}
				size="sm"
				type="button"
				variant="outline"
			>
				Set
			</Button>
		</div>
	);
};
