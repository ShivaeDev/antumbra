import type { display } from "@antumbra/domain-rulings/queries/display.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { RulingsApi } from "#glass.ts";
import { RulingCard } from "#ruling-card.tsx";

export const RulingsPanel = ({ api }: { readonly api: RulingsApi }) => (
	<section className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
		<header>
			<h2 className="text-lg">The rulings</h2>
		</header>
		<details>
			<summary>Proclaim a ruling</summary>
			<CommandForm command={api.rulings.proclaim} fixed={{ by: "admiral", subjects: [], choices: [], chosenChoice: null }} submit="Proclaim" titles />
		</details>
		<Live query={api.rulings.display} input={{}} waiting="Reading the rulings…">
			{(view) => (
				<>
					<OpenRulings api={api} view={view} />
					<section className="flex flex-col gap-3">
						<h3>Left for later</h3>
						{view.parked.map((ruling) => (
							<RulingCard api={api} ruling={ruling} key={ruling.id} />
						))}
					</section>
					<h2 className="text-lg">Standing rulings</h2>
					{view.standing.length === 0 ? (
						<p>No standing rulings.</p>
					) : (
						view.standing.map((ruling) => <RulingCard api={api} ruling={ruling} key={ruling.id} />)
					)}
				</>
			)}
		</Live>
	</section>
);

const OpenRulings = ({ api, view }: { readonly api: RulingsApi; readonly view: typeof display.output.Type }) =>
	view.openCount === 0 ? (
		<p>Nothing is waiting on you. A ruling appears here the moment an agent asks for one.</p>
	) : (
		view.groups.map((group) => (
			<section className="flex flex-col gap-3" key={group.id}>
				<h3>{group.name}</h3>
				{group.rulings.map((ruling) => (
					<RulingCard api={api} ruling={ruling} key={ruling.id} />
				))}
			</section>
		))
	);
