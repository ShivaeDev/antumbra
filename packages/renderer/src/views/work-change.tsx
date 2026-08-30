import type { WorkChange } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { groupTitle, groupVariant } from "#quay/groups.ts";
import { changeNumber } from "#quay/marks.ts";
import { ExternalLink } from "#views/external-link.tsx";

// why: a card says where a change stands in the words the quay sorts by and
// adds the one word the quay never needs — a merged change leaves the quay,
// but on the card it is the work that landed.
const STANDING_LABEL: Readonly<Record<WorkChange["standing"], string>> = {
	...groupTitle,
	landed: "Landed",
};

const STANDING_VARIANT: Readonly<
	Record<WorkChange["standing"], React.ComponentProps<typeof Badge>["variant"]>
> = { ...groupVariant, landed: "outline" };

// why: a change that reached a host is known by its number and a change that
// never did by its title alone, with the whole title a hover away either way.
const nameOf = (change: WorkChange["change"]): string => {
	const number = changeNumber(change);
	return number === "" ? change.title : number;
};

export const WorkChangeChip = ({ held }: { readonly held: WorkChange }) => (
	<span className="flex min-w-0 items-center gap-1">
		{held.change.url === null ? (
			<span
				className="min-w-0 truncate font-mono text-2xs text-muted-foreground"
				title={held.change.title}
			>
				{nameOf(held.change)}
			</span>
		) : (
			<ExternalLink
				className="min-w-0 truncate font-mono text-2xs"
				title={held.change.title}
				url={held.change.url}
			>
				{nameOf(held.change)}
			</ExternalLink>
		)}
		<Badge variant={STANDING_VARIANT[held.standing]}>
			{STANDING_LABEL[held.standing]}
		</Badge>
	</span>
);
