import { SectionHeading } from "@antumbra/glass-components/section.tsx";
import type { QuayChange } from "#glass.ts";

export const QuayWork = ({ item }: { readonly item: QuayChange }) => (
	<section className="flex flex-col gap-2">
		<SectionHeading count={item.pieces.length} title="Linked work" />
		<ul className="grid gap-2 sm:grid-cols-2">
			{item.pieces.map((berthing) => (
				<li className="rounded-md border border-border bg-card px-3 py-2" key={`${berthing.voyageId}/${berthing.id}`}>
					<p className="text-xs font-medium wrap-anywhere">{berthing.title}</p>
					<p className="text-2xs text-muted-foreground wrap-anywhere">{berthing.voyageName}</p>
				</li>
			))}
		</ul>
	</section>
);
