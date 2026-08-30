import ts from "typescript";

export const unwrapExpression = (expression: ts.Expression): ts.Expression => {
	if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
		return unwrapExpression(expression.expression);
	}
	return expression;
};

export const directServiceDefinitions = (source: ts.SourceFile, names: ReadonlySet<string>): readonly ts.CallExpression[] => {
	const found: ts.CallExpression[] = [];
	for (const statement of source.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (declaration.initializer === undefined) continue;
			const value = unwrapExpression(declaration.initializer);
			if (!ts.isCallExpression(value)) continue;
			const called = unwrapExpression(value.expression);
			if (ts.isIdentifier(called) && names.has(called.text)) found.push(value);
		}
	}
	return found;
};

const CONFIG_MEMBERS = new Set(["id", "initialize", "methods", "requires"]);

export const invalidServiceMembers = (config: ts.ObjectLiteralExpression): readonly ts.ObjectLiteralElementLike[] =>
	config.properties.filter((member) => !ts.isPropertyAssignment(member) || !ts.isIdentifier(member.name) || !CONFIG_MEMBERS.has(member.name.text));

export const serviceProperty = (object: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined =>
	object.properties.find(
		(candidate): candidate is ts.PropertyAssignment =>
			ts.isPropertyAssignment(candidate) && ts.isIdentifier(candidate.name) && candidate.name.text === name,
	);

export const returnedServiceMethods = (value: ts.Expression): ts.ObjectLiteralExpression | undefined => {
	if (!ts.isArrowFunction(value)) return;
	if (!ts.isBlock(value.body)) {
		const body = unwrapExpression(value.body);
		return ts.isObjectLiteralExpression(body) ? body : undefined;
	}
	if (value.body.statements.length !== 1) return;
	const [statement] = value.body.statements;
	if (statement === undefined || !ts.isReturnStatement(statement) || statement.expression === undefined) return;
	const result = unwrapExpression(statement.expression);
	return ts.isObjectLiteralExpression(result) ? result : undefined;
};

export const isEffectVoid = (value: ts.Expression, effects: ReadonlySet<string>): boolean =>
	ts.isPropertyAccessExpression(value) && ts.isIdentifier(value.expression) && effects.has(value.expression.text) && value.name.text === "void";

export const isOperationReference = (member: ts.ObjectLiteralElementLike, imports: ReadonlySet<string>): boolean => {
	if (ts.isShorthandPropertyAssignment(member)) {
		return imports.has(member.name.text);
	}
	if (!ts.isPropertyAssignment(member)) return false;
	const value = unwrapExpression(member.initializer);
	if (ts.isIdentifier(value)) return imports.has(value.text);
	return (
		ts.isCallExpression(value) && ts.isIdentifier(unwrapExpression(value.expression)) && imports.has(unwrapExpression(value.expression).getText())
	);
};

const isFunctionBody = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
	(ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
	node.body !== undefined;

export const implementationBodies = (source: ts.SourceFile, allowed: ReadonlySet<ts.Node>): readonly ts.Node[] => {
	const found: ts.Node[] = [];
	const visit = (node: ts.Node) => {
		if (isFunctionBody(node) && !allowed.has(node)) {
			found.push(node);
			return;
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
};
