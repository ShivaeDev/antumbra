import { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { OutcomeDetailView } from "@antumbra/glass-components/outcome-detail.tsx";
import type { OutcomeRef } from "@antumbra/glass-components/outcome-read.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { SquareArrowOutUpRightIcon } from "lucide-react";
import type { ReadArtifact } from "#glass.ts";
import { useArtifact } from "#read.ts";
export const ArtifactDetail = (props: {
	readonly artifact: OutcomeRef;
	readonly read: ReadArtifact;
	readonly onClose: () => void;
	readonly openWindow: (id: ArtifactId) => void;
}) => {
	const id = ArtifactId.make(props.artifact.id);
	const result = useArtifact(props.read, id);
	const detail = AsyncResult.match(result, {
		onInitial: () => ({ _tag: "loading" as const, title: props.artifact.title }),
		onFailure: (failure) => ({ _tag: "failed" as const, title: props.artifact.title, message: messageOf(failure.cause) }),
		onSuccess: ({ value }) => ({ _tag: "loaded" as const, title: value.title, markdown: value.markdown }),
	});
	return (
		<OutcomeDetailView
			detail={detail}
			onClose={props.onClose}
			reading="Reading the Artifact…"
			action={
				<Button aria-label="Open in a window" onClick={() => props.openWindow(id)} size="icon" title="Open in a window" type="button" variant="ghost">
					<SquareArrowOutUpRightIcon />
				</Button>
			}
		/>
	);
};
