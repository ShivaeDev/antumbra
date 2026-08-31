import type { StandingRulingView } from "@antumbra/contract";
import { useState } from "react";
import { supersedeRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Field } from "#views/field.tsx";

const SuccessorPick = ({
	onPick,
	others,
	ruling,
}: {
	readonly onPick: (byRulingId: string) => void;
	readonly others: ReadonlyArray<StandingRulingView>;
	readonly ruling: StandingRulingView;
}) => (
	<Select onValueChange={onPick}>
		<SelectTrigger aria-label={`Supersede "${ruling.question}" with`}>
			<SelectValue placeholder="A later standing ruling" />
		</SelectTrigger>
		<SelectContent>
			{others.map((other) => (
				<SelectItem key={other.id} value={other.id}>
					{other.question}
				</SelectItem>
			))}
		</SelectContent>
	</Select>
);

export const RulingSupersede = ({
	onError,
	others,
	ruling,
}: {
	readonly onError: (message: string) => void;
	readonly others: ReadonlyArray<StandingRulingView>;
	readonly ruling: StandingRulingView;
}) => {
	const [byRulingId, setByRulingId] = useState<string | undefined>(undefined);
	if (others.length === 0) {
		return null;
	}
	return (
		<div className="flex min-w-0 items-end gap-2 border-t border-border pt-2">
			<div className="min-w-0 flex-1">
				<Field label="Supersede with…">
					<SuccessorPick onPick={setByRulingId} others={others} ruling={ruling} />
				</Field>
			</div>
			<Button
				disabled={byRulingId === undefined}
				onClick={() => {
					if (byRulingId !== undefined) {
						supersedeRuling({ byRulingId, rulingId: ruling.id }, onError);
					}
				}}
				size="sm"
				type="button"
				variant="outline"
			>
				Supersede
			</Button>
		</div>
	);
};
