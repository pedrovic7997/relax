declare namespace drcAst {
	type Operator = '=' | '!=' | '<' | '>' | '<=' | '>='
	type Quantifier = 'exists' | 'forAll'
	type LogicalOperator = 'or' | 'and' | 'implies'

	interface CodeInfo {
		location: {
			start: { offset: number, line: number, column: number },
			end: { offset: number, line: number, column: number },
		},
		text: string
	}

	interface DRC_Expr {
		codeInfo: CodeInfo
		type: 'DRC_Expr',
		variables: string[],
		projections: Projection[]
		formula: LogicalExpression | RelationPredicate
	}

	type Projection = (relalgAst.columnName | relalgAst.namedColumnExpr)[]

	interface LogicalExpression {
		codeInfo: CodeInfo
		type: 'LogicalExpression',
		left: AttributeReference | LogicalExpression,
		operator: LogicalOperator,
		right: LogicalExpression | QuantifiedExpression | Predicate
	}

	interface RelationPredicate {
		codeInfo: CodeInfo
		type: 'RelationPredicate',
		relation: string,
		variables: string[] 
	}

	interface Predicate {
		codeInfo: CodeInfo
		type: 'Predicate',
		condition: relalgAst.valueExpr
	}

	interface AttributeReference {
		codeInfo: CodeInfo
		type: 'AttributeReference',
		variable: string,
		attribute: string
	}

	interface QuantifiedExpression {
		codeInfo: CodeInfo
		type: 'QuantifiedExpression',
		quantifier: Quantifier,
		variables: string[],
		formula: LogicalExpression 
	}

	interface Negation {
		codeInfo: CodeInfo
		type: 'Negation',
		formula: LogicalExpression
	}
}