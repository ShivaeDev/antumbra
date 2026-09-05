import { type ReactNode, useState } from "react";
import { Button } from "#components/ui/button.tsx";

export interface RulingAct {
	readonly act: ReactNode;
	readonly words: string;
}

export const RulingActs = ({ acts }: { readonly acts: ReadonlyArray<RulingAct> }) => {
	const [shown, setShown] = useState<string | undefined>(undefined);
	const open = acts.find((each) => each.words === shown);
	return (
		<div className="flex min-w-0 flex-col gap-2 border-t border-border pt-2">
			<div className="flex min-w-0 flex-wrap items-center gap-1">
				{acts.map((each) => (
					<Button
						aria-expanded={each.words === shown}
						key={each.words}
						onClick={() => setShown(each.words === shown ? undefined : each.words)}
						size="sm"
						type="button"
						variant="ghost"
					>
						{each.words}
					</Button>
				))}
			</div>
			{open === undefined ? null : open.act}
		</div>
	);
};
