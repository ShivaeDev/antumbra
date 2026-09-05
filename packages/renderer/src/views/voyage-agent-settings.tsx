import type { VoyageAgentRole } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { setAgentSettings } from "#adapters/trpc-voyages.ts";
import { RequestForm } from "#forms/view.tsx";
import { useBackendModels } from "#hooks/backend-models.ts";
import { AgentSettingsChoice } from "#views/agent-settings-choice.tsx";

const chosen = (value: string): string | null => (value.trim() === "" ? null : value.trim());
const settingsSchema = Schema.Struct({ effort: Schema.String, model: Schema.String });

export const AgentSettingsEditor = ({
	agentRole,
	backend,
	effort,
	label,
	model,
	voyageId,
}: {
	readonly agentRole: VoyageAgentRole;
	readonly backend: string;
	readonly effort: string | null;
	readonly label: string;
	readonly model: string | null;
	readonly voyageId: string;
}) => {
	const catalog = useBackendModels(backend);
	const form = useRequestForm({
		defaultValues: { effort: effort ?? "", model: model ?? "" },
		schema: settingsSchema.check(
			Schema.makeFilter((value) => (chosen(value.model) === model && chosen(value.effort) === effort ? "Choose a model or effort" : undefined)),
		),
		request: (value) => setAgentSettings({ effort: chosen(value.effort), model: chosen(value.model), role: agentRole, voyageId }),
		resetAfterSuccess: (value) => value,
		onSuccess: () => undefined,
	});
	const unmoved = useStore(form.store, (state) => chosen(state.values.model) === model && chosen(state.values.effort) === effort);
	return (
		<RequestForm form={form}>
			<div className="flex min-w-0 flex-wrap items-end gap-2">
				<AgentSettingsChoice
					form={form}
					fields={{ model: "model", effort: "effort" }}
					catalog={catalog}
					label={label}
					placeholder="the backend's own"
				/>
				<form.Submit disabled={unmoved} pending="Setting…" size="sm" variant="outline">
					Set
				</form.Submit>
			</div>
		</RequestForm>
	);
};
