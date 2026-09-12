import { Button } from "@antumbra/glass-components/ui/button.tsx";

const copy = (total: number, selectedId: string | undefined) => {
	if (total === 0) return { title: "Nothing at the quay", detail: "A pull request appears once a piece opens one, or once you adopt one by hand." };
	if (selectedId !== undefined)
		return { title: "Pull request no longer at the quay", detail: "It may have landed or been withdrawn since this window last pointed to it." };
	return { title: "Select a pull request", detail: "Choose one from the list to inspect its status, linked work and origin." };
};
export const QuayEmpty = (props: { readonly total: number; readonly selectedId?: string | undefined; readonly onBack: () => void }) => {
	const words = copy(props.total, props.selectedId);
	return (
		<div className="m-auto flex flex-col gap-2 p-6 text-center">
			<h3 className="text-sm">{words.title}</h3>
			<p className="text-xs text-muted-foreground">{words.detail}</p>
			{props.selectedId === undefined ? null : (
				<Button onClick={props.onBack} variant="outline">
					Back to pull requests
				</Button>
			)}
		</div>
	);
};
