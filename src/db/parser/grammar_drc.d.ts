declare namespace drcAst {
	type Operator = '=' | '!=' | '<' | '>' | '<=' | '>='
	type Quantifier = 'exists' | 'forAll'
	type LogicalOperator = 'or' | 'and' | 'implies'

	interface DRC_Expr {
		type: 'DRC_Expr',
		variables: string[],
		projections: Projection[]
		formula: LogicalExpression | RelationPredicate
	}

	type Projection = (relalgAst.columnName | relalgAst.namedColumnExpr)[]

	interface LogicalExpression {
		type: 'LogicalExpression',
		left: AttributeReference | LogicalExpression,
		operator: LogicalOperator,
		right: LogicalExpression | QuantifiedExpression | Predicate
	}

	interface RelationPredicate {
		type: 'RelationPredicate',
		relation: string,
		variables: string[] 
	}

	interface Predicate {
		type: 'Predicate',
		condition: relalgAst.valueExpr
	}

	interface AttributeReference {
		type: 'AttributeReference',
		variable: string,
		attribute: string
	}

	interface QuantifiedExpression {
		type: 'QuantifiedExpression',
		quantifier: Quantifier,
		variable: string,
		formula: LogicalExpression 
	}

	interface Negation {
		type: 'Negation',
		formula: LogicalExpression
	}
}