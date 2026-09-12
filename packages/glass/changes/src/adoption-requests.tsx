import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { ChangesApi } from "#glass.ts";
export const AdoptionRequests = ({ api }: { readonly api: ChangesApi }) => (
	<Live query={api.changes.adoptions} input={{}}>
		{(requests) => (
			<div className="flex flex-col gap-2">
				{requests.map((request) => (
					<div key={request.id} className="rounded border border-border p-2">
						<p className="text-xs">{request.url}</p>
						{request.error === null ? (
							<p className="text-2xs text-muted-foreground">Adopting pull request…</p>
						) : (
							<>
								<p className="text-xs text-destructive" role="alert">
									{request.error}
								</p>
								<CommandForm command={api.changes.retryAdoption} fixed={["id"]} row={request} submit="Retry adoption" label="Retry adoption" titles />
							</>
						)}
					</div>
				))}
			</div>
		)}
	</Live>
);
