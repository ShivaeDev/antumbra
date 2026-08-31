import type { QuayPiece } from "@antumbra/contract";
import { type ReactNode, useState } from "react";
import { adoptChange } from "#adapters/trpc-quay.ts";
import { Button } from "#components/ui/button.tsx";
import { DialogFooter } from "#components/ui/dialog-sections.tsx";
import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { useCall } from "#hooks/call.ts";

const offered = (pieces: ReadonlyArray<QuayPiece>): ReadonlyArray<QuayPiece> =>
	pieces.filter((piece, index) => pieces.findIndex((other) => other.id === piece.id) === index);

const Field = ({ children, label }: { readonly children: ReactNode; readonly label: string }) => (
	<div className="flex flex-col gap-1">
		<span className="text-2xs text-muted-foreground">{label}</span>
		{children}
	</div>
);

const PieceChoice = ({ choices, onPiece }: { readonly choices: ReadonlyArray<QuayPiece>; readonly onPiece: (pieceId: string) => void }) => (
	<Select onValueChange={onPiece}>
		<SelectTrigger aria-label="Piece">
			<SelectValue placeholder="Choose a piece" />
		</SelectTrigger>
		<SelectContent>
			{choices.map((piece) => (
				<SelectItem key={piece.id} value={piece.id}>
					{piece.voyageName} › {piece.title}
				</SelectItem>
			))}
		</SelectContent>
	</Select>
);

export const AdoptChangeForm = ({ onAdopted, pieces }: { readonly onAdopted: () => void; readonly pieces: ReadonlyArray<QuayPiece> }) => {
	const [pieceId, setPieceId] = useState<string | undefined>(undefined);
	const [repoName, setRepoName] = useState("");
	const [url, setUrl] = useState("");
	const adopting = useCall<void>();
	const choices = offered(pieces);
	const busy = adopting.state._tag === "pending";
	const ready = pieceId !== undefined && repoName !== "" && url !== "";

	const adopt = () => {
		if (pieceId === undefined) {
			return;
		}
		adopting.run((onDone, onFailed) =>
			adoptChange(
				{ pieceId, repoName, url },
				() => {
					setUrl("");
					onDone();
					onAdopted();
				},
				onFailed,
			),
		);
	};

	if (choices.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				No piece is chartered yet — a change is adopted onto the piece that owes it, so charter one first
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-3">
			<Field label="Piece">
				<PieceChoice choices={choices} onPiece={setPieceId} />
			</Field>
			<Field label="Repository">
				<Input aria-label="Repository" onChange={(event) => setRepoName(event.target.value)} placeholder="shoals" value={repoName} />
			</Field>
			<Field label="Address">
				<Input aria-label="Address" onChange={(event) => setUrl(event.target.value)} placeholder="https://…" value={url} />
			</Field>
			{adopting.state._tag === "failed" ? <p className="text-2xs text-destructive">{adopting.state.message}</p> : null}
			<DialogFooter>
				<Button disabled={!ready || busy} onClick={adopt} type="button">
					{busy ? "Adopting…" : "Adopt"}
				</Button>
			</DialogFooter>
		</div>
	);
};
