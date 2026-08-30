import ts from "typescript";

const directCallableName = (node: ts.FunctionLikeDeclaration, source: ts.SourceFile): string | undefined => {
	if (ts.isVariableDeclaration(node.parent) && node.parent.initializer === node) {
		return node.parent.name.getText(source);
	}
	return ts.isFunctionDeclaration(node) ? node.name?.getText(source) : undefined;
};

export const isForeignCompositionSeam = (
	file: string,
	node: ts.FunctionLikeDeclaration,
	parameter: string,
	type: string,
	source: ts.SourceFile,
): boolean => {
	if (parameter !== "runtime" || type !== "AppRuntime") return false;
	const callable = directCallableName(node, source);
	return (
		(file === "packages/contract/src/router-procedure.ts" && callable === "makeProcedure") ||
		(file === "packages/contract/src/router.ts" && callable === "makeAppRouter")
	);
};
