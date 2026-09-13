import type { SessionModelSpend, SessionStanding } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { compactTokens, exactTokens, summaryCost } from "#costs/format.ts";

export const modelWords = (spent: SessionModelSpend): string => {
	const cost = summaryCost(spent);
	return [
		spent.model,
		`in ${exactTokens(spent.inputTokens)}`,
		`out ${exactTokens(spent.outputTokens)}`,
		...(spent.cacheReadTokens === 0 ? [] : [`cache read ${exactTokens(spent.cacheReadTokens)}`]),
		...(spent.cacheWriteTokens === 0 ? [] : [`cache write ${exactTokens(spent.cacheWriteTokens)}`]),
		...(cost === undefined ? [] : [cost]),
	].join(" · ");
};

export const cacheHit = (standing: SessionStanding): string | undefined => {
	const supplied = standing.tokens.inputTokens + standing.tokens.cacheReadTokens + standing.tokens.cacheWriteTokens;
	return supplied === 0 ? undefined : `${Math.round((standing.tokens.cacheReadTokens / supplied) * 100)}% cache hit`;
};

const tokenWords = (standing: SessionStanding): string | undefined => {
	const held = standing.tokens;
	const total = held.inputTokens + held.outputTokens + held.cacheReadTokens + held.cacheWriteTokens;
	return total === 0 ? undefined : `${compactTokens(total)} tokens`;
};

export const costWords = (standing: SessionStanding): string | undefined => {
	const turn = summaryCost(standing.turn);
	const session = summaryCost(standing.spend);
	const words = [...(turn === undefined ? [] : [`turn ${turn}`]), ...(session === undefined ? [] : [`session ${session}`])];
	return words.length === 0 ? undefined : words.join(" · ");
};

export const SessionCosts = ({ standing }: { readonly standing: SessionStanding }) => {
	const words = costWords(standing) ?? tokenWords(standing);
	const hit = cacheHit(standing);
	if (words === undefined) {
		return null;
	}
	return (
		<Tooltip>
			<TooltipTrigger className="shrink-0 text-xs text-muted-foreground tabular-nums">{words}</TooltipTrigger>
			<TooltipContent className="max-w-sm">
				{standing.models.map((spent) => (
					<p key={spent.model}>{modelWords(spent)}</p>
				))}
				{hit === undefined ? null : <p>{hit}</p>}
				{standing.rateLimit === undefined ? null : <p>rate limit {standing.rateLimit}</p>}
			</TooltipContent>
		</Tooltip>
	);
};
