import type { VoyageAgentRole } from "@antumbra/contract";
import { useState } from "react";
import { setAgentSettings } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { useBackendModels } from "#hooks/backend-models.ts";
import { AgentSettingsChoice } from "#views/agent-settings-choice.tsx";

const chosen = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export const AgentSettingsEditor = ({
	agentRole,
	backend,
	effort,
	label,
	model,
	onError,
	voyageId,
}: {
	readonly agentRole: VoyageAgentRole;
	readonly backend: string;
	readonly effort: string | null;
	readonly label: string;
	readonly model: string | null;
	readonly onError: (message: string) => void;
	readonly voyageId: string;
}) => {
	const catalog = useBackendModels(backend);
	const [next, setNext] = useState({ effort: effort ?? "", model: model ?? "" });
	const unmoved = chosen(next.model) === model && chosen(next.effort) === effort;
	return (
		<div className="flex min-w-0 flex-wrap items-end gap-2">
			<AgentSettingsChoice catalog={catalog} effort={next.effort} label={label} model={next.model} onChange={setNext} />
			<Button
				disabled={unmoved}
				onClick={() => setAgentSettings({ effort: chosen(next.effort), model: chosen(next.model), role: agentRole, voyageId }, onError)}
				size="sm"
				type="button"
				variant="outline"
			>
				Set
			</Button>
		</div>
	);
};
