import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { SettingsApi } from "#glass.ts";

const WAITING = "Reading the fleet's settings…";

export const Settings = (props: { readonly api: SettingsApi }) => (
	<div className="flex flex-col gap-1">
		<Live input={{}} query={props.api.settings.flags} waiting={WAITING}>
			{(rows) =>
				rows.map((row, place) => (
					<CommandForm
						command={props.api.settings.setFlag}
						description={row.description}
						key={row.key}
						label={row.title}
						row={row}
						titles={place === 0}
					/>
				))
			}
		</Live>
		<Live input={{}} query={props.api.settings.counts} waiting={WAITING}>
			{(rows) =>
				rows.map((row, place) => (
					<CommandForm
						command={props.api.settings.setCount}
						description={row.description}
						key={row.key}
						label={row.title}
						row={row}
						titles={place === 0}
					/>
				))
			}
		</Live>
	</div>
);
