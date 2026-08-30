import type { QuayChange } from "#quay/changes.ts";
import { SectionHeading } from "#views/section.tsx";

export const QuayWork = ({ item }: { readonly item: QuayChange }) => (
	<section className="flex flex-col gap-2">
		<SectionHeading count={item.berthings.length} title="Linked work" />
		<ul className="grid gap-2 sm:grid-cols-2">
			{item.berthings.map((berthing) => (
				<li className="rounded-md border border-border bg-card px-3 py-2" key={`${berthing.voyageId}/${berthing.pieceId}`}>
					<p className="text-xs font-medium wrap-anywhere">{berthing.pieceTitle}</p>
					<p className="text-2xs text-muted-foreground wrap-anywhere">{berthing.voyageName}</p>
				</li>
			))}
		</ul>
	</section>
);
