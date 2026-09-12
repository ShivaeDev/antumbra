import type { RulingDisplay } from "@antumbra/domain-rulings/rows/display.ts";
import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import type { RulingsApi } from "#glass.ts";
import { RulingActs, StandingActs } from "#ruling-acts.tsx";

export const RulingCard = ({ api, ruling }: { readonly api: RulingsApi; readonly ruling: RulingDisplay }) => (
	<article className="flex flex-col gap-3 rounded-lg border border-border p-4" aria-label={ruling.question}>
		<header>
			<h3 className="font-medium">{ruling.question}</h3>
			<p className="text-xs text-muted-foreground">
				{ruling.requesterName} · {ruling.radius} · {ruling.urgency} · {ruling.voyage?.name ?? "Fleet"}
			</p>
		</header>
		<MarkdownView markdown={ruling.context} />
		{ruling.answer === null ? <p className="text-xs text-muted-foreground">Waiting on {ruling.rungName}</p> : null}
		{ruling.recommendation === null ? null : (
			<p className="whitespace-pre-wrap text-sm">
				<strong>Recommended: {ruling.recommendedLabel}</strong>
				{" — "}
				{ruling.recommendation.reasoning}
			</p>
		)}
		{ruling.choices.length === 0 ? null : (
			<ul className="list-disc pl-5">
				{ruling.choices.map((choice) => (
					<li key={choice.id}>
						{choice.label}
						{choice.detail === null ? null : ` — ${choice.detail}`}
					</li>
				))}
			</ul>
		)}
		{ruling.gatedPieces.length === 0 ? null : <p className="text-xs">Gates {ruling.gatedPieces.map((piece) => piece.title).join(", ")}</p>}
		{ruling.contexts.map((context) => (
			<blockquote className="whitespace-pre-wrap border-l-2 border-border pl-3" key={context.id}>
				<p className="text-xs text-muted-foreground">
					{context.authorAgentId === null ? "The admiral" : (ruling.speakers[context.authorAgentId] ?? "Agent")}
				</p>
				<MarkdownView markdown={context.body} />
			</blockquote>
		))}
		{ruling.reclassifications.map((move, index) => (
			<p className="text-xs" key={`${move.at}:${index}`}>
				{move.by}
				{move.radius === null ? null : ` · ${move.radius}`}
				{move.urgency === null ? null : ` · ${move.urgency}`}
				{move.note === null ? null : ` — ${move.note}`}
			</p>
		))}
		{ruling.parked === null ? null : <p className="whitespace-pre-wrap text-sm">Left for later: {ruling.parked.note}</p>}
		{ruling.answer === null ? (
			<RulingActs api={api} ruling={ruling} />
		) : (
			<>
				<MarkdownView markdown={ruling.answer.text} />
				{ruling.chosenLabel === null ? null : <p>Chosen: {ruling.chosenLabel}</p>}
				<p className="text-xs text-muted-foreground">
					Ruled by {ruling.answer.by} · {ruling.answer.at}
				</p>
				{ruling.stale ? <p className="text-xs">The work this ruling concerned has concluded.</p> : null}
				<StandingActs api={api} ruling={ruling} />
			</>
		)}
		<footer className="text-xs text-muted-foreground">{ruling.subjectLabels.map((subject) => subject.label).join(" · ")}</footer>
	</article>
);
