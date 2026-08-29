import type { StandingRulingView } from "@antumbra/contract";
import { useState } from "react";
import { supersedeRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Field } from "#views/field.tsx";

// why: the only thing that can take a standing ruling's place is another
// standing ruling, so the pick offers exactly those and nothing free-form.
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

// why: a standing ruling is never edited. The one act on it is naming the
// later ruling that takes its place, and that act is confirmed apart from the
// pick so a stray selection supersedes nothing.
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
					<SuccessorPick
						onPick={setByRulingId}
						others={others}
						ruling={ruling}
					/>
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
