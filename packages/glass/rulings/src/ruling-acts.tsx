import type { RulingDisplay } from "@antumbra/domain-rulings/rows/display.ts";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { RulingsApi } from "#glass.ts";

export const RulingActs = ({ api, ruling }: { readonly api: RulingsApi; readonly ruling: RulingDisplay }) => {
	const identity = { rulingId: ruling.id, by: "admiral" as const, byAgentId: null };
	return (
		<div className="flex flex-col gap-3">
			<CommandForm command={api.rulings.answer} fixed={identity} submit="Rule" titles />
			<details>
				<summary>Ask more</summary>
				<CommandForm command={api.rulings.addContext} fixed={{ rulingId: ruling.id, authorAgentId: null }} submit="Ask" titles />
			</details>
			{ruling.parked === null ? (
				<details>
					<summary>Not now</summary>
					<CommandForm command={api.rulings.park} fixed={{ rulingId: ruling.id }} submit="Leave for later" titles />
				</details>
			) : null}
			<details>
				<summary>Reclassify</summary>
				<CommandForm
					command={api.rulings.reclassify}
					fixed={identity}
					row={{ radius: ruling.radius, urgency: ruling.urgency, note: null }}
					label="Reclassify"
					submit="Reclassify"
					titles
				/>
			</details>
		</div>
	);
};

export const StandingActs = ({ api, ruling }: { readonly api: RulingsApi; readonly ruling: RulingDisplay }) => (
	<div className="flex flex-col gap-2">
		<details>
			<summary>Supersede</summary>
			<CommandForm command={api.rulings.supersede} fixed={{ rulingId: ruling.id, by: "admiral" }} submit="Supersede" titles />
		</details>
		<details>
			<summary>Withdraw</summary>
			<CommandForm command={api.rulings.withdraw} fixed={{ rulingId: ruling.id, by: "admiral" }} submit="Withdraw" titles />
		</details>
	</div>
);
