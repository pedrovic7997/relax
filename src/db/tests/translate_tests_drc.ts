/*** Copyright 2016 Johannes Kessler 2016 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// cspell:disable

import { Relation } from 'db/exec/Relation';
import { RANode } from '../exec/RANode';
import * as relalgjs from '../relalg';
import { Schema } from '../exec/Schema';
import { assert } from 'node_modules/@types/qunit';


const srcSchemaR: Schema = new Schema();
srcSchemaR.addColumn('a', null, 'number');
srcSchemaR.addColumn('b', null, 'string');
srcSchemaR.addColumn('c', null, 'string');

const srcTableR: Relation = new Relation('R').setSchema(srcSchemaR);
srcTableR.addRows([
	[1,    'a',   'd'],
	[3,    'c',   'c'],
	[4,    'd',   'f'],
	[5,    'd',   'b'],
	[6,    'e',   'f'],
	[1000, 'e',   'k']
]);

const srcSchemaS: Schema = new Schema();
srcSchemaS.addColumn('b', null, 'string');
srcSchemaS.addColumn('d', null, 'number');

const srcTableS: Relation = new Relation('S').setSchema(srcSchemaS);
srcTableS.addRows([
	['a', 100],
	['b', 300],
	['c', 400],
	['d', 200],
	['e', 150]
]);

const srcSchemaT: Schema = new Schema();
srcSchemaT.addColumn('b', null, 'string');
srcSchemaT.addColumn('d', null, 'number');

const srcTableT: Relation = new Relation('T').setSchema(srcSchemaT);
srcTableT.addRows([
	['a', 100],
	['d', 200],
	['f', 400],
	['g', 120]
]);

const relations: {
	R: Relation,
	S: Relation,
	T: Relation,
} = {
	R: srcTableR,
	S: srcTableS,
	T: srcTableT,
};


function exec_drc(query: string): RANode {
	const ast = relalgjs.parseDRCSelect(query);
	const root = relalgjs.relalgFromDRCAstRoot(ast, relations);
	root.check();

	return root;
}

function exec_ra(query: string) {
	return relalgjs.executeRelalg(query, relations);
}


QUnit.module('translate drc ast to relational algebra', () => {

	QUnit.module('Projection', () => {
		QUnit.module('Single relation', () => {
			QUnit.test('test project all columns', (assert) => {
				const query = '{ <a,b,c> | <a,b,c> in R }';
				const root = exec_drc(query);

				assert.deepEqual(root.getResult().getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('test project all columns (in operator)', (assert) => {
				const query = '{ <a,b,c> | <a,b,c> in R }';
				const root = exec_drc(query);

				assert.deepEqual(root.getResult().getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('test project all columns (∈ operator)', (assert) => {
				const query = '{ <a,b,c> | <a,b,c> ∈ R  }';
				const root = exec_drc(query);

				assert.deepEqual(root.getResult().getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('test project some columns', (assert) => {
				const queryDrc = '{ <y> | <x,y,z> ∈ R}';
				const queryRa = 'π R.y ( ρ x←a, y←b, z←c R ⋉ R ) ';

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultRa, resultDrc);
			});
		});

		QUnit.module('Multiple relations', () => {
			QUnit.test('test project all columns', (assert) => {
				const queryDrc = '{ <x,y,z,r,s> | <x,y,z> in R and <r,s> in S }';
				const queryRa = 'ρ x←a, y←b, z←c R ⨯ ρ r←b, s←d S'

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc, resultRa);
			});

			QUnit.test('test project some columns', (assert) => {
				const queryDrc = '{ <x,r> | <x,y,z> in R and <r,s> in S }';
				const queryRa = 'π R.x, S.r ( ρ x←a, y←b, z←c R ⨯ ρ r←b, s←d S )'

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc, resultRa);
			});

			QUnit.test('test project repeated relations', (assert) => {
				const queryDrc = '{ <x,y,z,a,b,c> | <x,y,z> in R and <a,b,c> in R }';
				const queryRa = 'π R.x, R.y, R.z, R.a, R.b, R.c ( ρ x←a, y←b, z←c R ⨯ ρ a←a, b←b, c←c R )'

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc, resultRa);
			});
		});
	});

	QUnit.module('Formulae ordering', () => {
		QUnit.test('relation predicate in the first position', (assert) => {
			const queryDrc = "{ <a,b,c> | <a,b,c> in R and abs(a) > 0 }";
			const queryRa = "sigma abs(a)>0 (R)";

			const resultDrc = exec_drc(queryDrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('relation predicate in the last position', (assert) => {	
			const queryDrc = "{ <a,b,c> | abs(a) > 0 and <a,b,c> in R }";
			const queryRa = "sigma abs(a)>0 (R)";

			const resultDrc = exec_drc(queryDrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});
	});

	QUnit.module('Logical implication', () => {
		QUnit.test('given logical implication, it should return tuples that match the condition', (assert) => {
			const queryDrc = "{ <a,b,c> | <a,b,c> in R and a > 5 ⇒ b = 'e' }";
			// NOTE: p → q ≡ ¬p ∨ q
			const queryRa = "sigma (a <= 5 or b = 'e') (R)";

			const resultDrc = exec_drc(queryDrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given logical implication with false rigth arm, it should return tuples that match the condition', (assert) => {
			const queryDrc = "{ <a,b,c> | <a,b,c> in R and a > 0 ⇒ b = 'e' }";
			// NOTE: p → q ≡ ¬p ∨ q
			const queryRa = "sigma (a <= 0 or b = 'e') (R)";

			const resultDrc = exec_drc(queryDrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given logical implication, it should not return tuples that match the condition', (assert) => {
				const queryDrc = "{ <a,b,c> | <a,b,c> in R and not (a > 5 ⇒ b = 'a') }";
				// NOTE: ¬(A → B) ≡ A ∧ ¬B
				const queryRa = "sigma (a > 5 and b != 'a') (R)";

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});
		});
	});

	QUnit.module('Logical biconditional (equivalence)', () => {
		QUnit.test('given logical biconditional, it should return tuples that match the condition', (assert) => {
			const queryDrc = "{ <a,b,c> | <a,b,c> in R and a > 6 ⇔ b = 'f' }";
			// NOTE: p ⇔ q = (p ∧ q) ∨ (¬p ∧ ¬q)
			const queryRa = "sigma ((a > 6) ∧ (b = 'f')) ∨ (¬(a > 6) ∧ ¬(b = 'f')) R";

			const resultDrc = exec_drc(queryDrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given logical biconditional, it should not return tuples that match the condition', (assert) => {
				const queryDrc = "{ <a,b,c> | <a,b,c> in R and not (a > 3 ⇔ b = 'e') }";
				// NOTE: ¬(p ⇔ q) = (¬p ∨ ¬q) ∧ (p ∨ q)
				const queryRa = "sigma (¬(a > 3) ∨ ¬(b = 'e') ) ∧ ((a > 3) ∨ (b = 'e')) R";

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});
		});
	});

	QUnit.module('Predicates', () => {
		QUnit.module('Conjunction', () => {
			QUnit.test('Multiple relations with binding predicate', assert => {
				const queryDrc = '{ <x,y,z,r,s> | <x,y,z> in R and <r,s> in S and y=r}';
				const queryRa = 'π R.x, R.y, R.z, S.r, S.s ( ( ρ x←a, y←b, z←c R ⨯ ρ r←b, s←d S ) ∩ σ y = r ( ρ x←a, y←b, z←c R ⨯ ρ r←b, s←d S ) ) ';

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc, resultRa);
			})
			QUnit.test('given predicate with conjunction, when all the conditions meet, should return tuples', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and (a < 5 and a > 3) }';
				const queryRa = 'sigma a < 5 and a > 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.module('Negation', () => {
				QUnit.test('given predicate with conjunction, when all the conditions meet, should not return tuples', (assert) => {
					const queryDrc = '{ <a,b,c> | <a,b,c> in R and not (a < 5 and a > 3) }';
					const queryRa = 'sigma a >= 5 or a <= 3 (R)';

					const resultDrc = exec_drc(queryDrc).getResult().getRows().sort()
					const resultRa = exec_ra(queryRa).getResult().getRows().sort()

					assert.deepEqual(resultDrc, resultRa);
				});
			});
		});

		QUnit.module('Negation', () => {
			QUnit.test('test > predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not(a > 3) }';
				const queryRa = 'sigma a <= 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test < predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not(a < 3) }';
				const queryRa = 'sigma a >= 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test = predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not(a = 3) }';
				const queryRa = 'sigma a != 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test <= predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not(a <= 3) }';
				const queryRa = 'sigma a > 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test >= predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not(a >= 3) }';
				const queryRa = 'sigma a < 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test != predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not(a != 3) }';
				const queryRa = 'sigma a = 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});
		})

		QUnit.module('Comparison', () => {
			QUnit.test('test > predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and a > 3 }';
				const queryRa = 'sigma a > 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('negation test > predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and a > 3 }';
				const queryRa = 'sigma a > 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test < predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and a < 3 }';
				const queryRa = 'sigma a < 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test = predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and a = 3 }';
				const queryRa = 'sigma a = 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test <= predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and a <= 3 }';
				const queryRa = 'sigma a <= 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test >= predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and a >= 3 }';
				const queryRa = 'sigma a >= 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test != predicate', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and a != 3 }';
				const queryRa = 'sigma a != 3 (R)';

				const resultDrc = exec_drc(queryDrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});
		})
	});

	QUnit.module('Set operations', () => {
		QUnit.test('test intersect between two Relation Predicates', (assert) => {
			const queryDrc = '{ <x,y> | <x,y> in S and <x,y> in T }';
			const queryRa = 'pi S.x, S.y (ρ x←b, y←d S intersect ρ x←b, y←d T)';

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc, resultRa);
		});
		QUnit.test('test union between two Relation Predicates', (assert) => {
			const queryDrc = '{ <x,y> | <x,y> in S or <x,y> in T }';
			const queryRa = 'pi S.x, S.y (ρ x←b, y←d S union ρ x←b, y←d T)';

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc, resultRa);
		});
		QUnit.test('test difference between two Relation Predicates', (assert) => {
			const queryDrc = '{ <x,y> | <x,y> in S and not <x,y> in T }';
			const queryRa = 'pi S.x, S.y (ρ x←b, y←d S except ρ x←b, y←d T)';

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc, resultRa);
		});

		QUnit.module('Nested scopes', () => {
			QUnit.test('test nested scopes', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not ∃r( <r,s> in S and not <r,s> in T and s > 400) }';
				const queryRa = 'π R.a, R.b, R.c ( ρ a←a, b←b, c←c R - ( ρ a←a, b←b, c←c R ⋉ ( ( ρ r←b, s←d S - ρ r←b, s←d T ) ∩ σ s > 400 ( ρ r←b, s←d S - ρ r←b, s←d T ) ) ) )';

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});
		});
	});

	QUnit.module('existencial quantifier operator(∃)', () => {
		QUnit.test('given ∃ operator with no tuple variable refence and at least one true condition, should return all tuples', (assert) => {
			const queryDrc = '{ <a,b,c> | <a,b,c> in R and ∃r( <r,s> in S and s > 300) }';

			const resultDrc = exec_drc(queryDrc).getResult()
			const resultRa = srcTableR.getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∃ operator with no tuple variable reference and false condition, should return no tuples', (assert) => {
			const queryDrc = '{ <a,b,c> | <a,b,c> in R and ∃r( <r,s> in S and s > 1000) }';

			const resultDrc = exec_drc(queryDrc).getResult();

			assert.equal(resultDrc.getNumRows(), 0);
		});

		QUnit.test('given ∃ operator with tuple variable reference and true condition, should return tuples that match the condition', (assert) => {
			const queryDrc = '{ <a,b,c> | <a,b,c> in R and ∃r( <r,s> in S and r = b) }';
			const queryRa = 'pi R.a, R.b, R.c (R join R.b = S.b S)'

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∃ with simple Relation Predicate with no correlation to the outer scope of quantifier operator', (assert) => {
			const queryDrc = '{<a,b> | <a,b> in S and ∃r( <r,s,t> in R)}';
			const queryRa = 'π S.a, S.b ( ρ a←b, b←d S ⋉ ( ( ρ r←a, s←b, t←c R ⨯ ρ a←b, b←d S ) ⋉ ρ r←a, s←b, t←c R ) )'

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∃ with multiple variables and simple Relation Predicate with no correlation to the outer scope of quantifier operator', (assert) => {
			const queryDrc = '{<a,b> | <a,b> in S and ∃r,s( <r,s,t> in R)}';
			const queryRa = 'π S.a, S.b ( ρ a←b, b←d S ⋉ ( ( ρ r←a, s←b, t←c R ⨯ ρ a←b, b←d S ) ⋉ ρ r←a, s←b, t←c R ) )'

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given ¬∃ with no tuple variable refence and at least one exists true condition, should return no tuples', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not ∃r( <r,s> in S and s > 300) }';

				const resultDrc = exec_drc(queryDrc).getResult()

				assert.equal(resultDrc.getNumRows(), 0);
			});

			QUnit.test('given ¬∃ with no tuple variable reference and exists false condition, should return all tuples', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not ∃r( <r,s> in S and s > 1000) }';

				const resultDrc = exec_drc(queryDrc).getResult();

				assert.deepEqual(resultDrc.getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('given ¬∃ with tuple variable reference and, return tuples that do not match the condition', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not ∃r( <r,s> in S and (s < 200 and a < 3)) }';
				const queryRa = 'sigma R.a >= 3 (R)'

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});
		});
	});

	QUnit.module('universal quantifier operator(∀)', () => {
		QUnit.test('given ∀ operator with relation predicate, should return all tuples', (assert) => {
			const queryDrc = '{ <a,b,c> | <a,b,c> in R and ∀s (<r,s> in S) }';

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = srcTableR.getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∀ operator with multiple variables and relation predicate, should return all tuples', (assert) => {
			const queryDrc = '{ <a,b,c> | <a,b,c> in R and ∀r,s (<r,s> in S) }';
			const queryRa = 'π R.a, R.b, R.c ( ρ a←a, b←b, c←c R ⋉ ( ( ρ r←b, s←d S ⨯ ρ a←a, b←b, c←c R ) ⋉ ρ r←b, s←d S ) ) '

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∀ operator with no tuple variable reference and true condition for some elements but not all, should return no tuples', (assert) => {
			const queryDrc = '{ <a,b,c> | <a,b,c> in R and ∀s(<r,s> in S and s > 300) }';

			const resultDrc = exec_drc(queryDrc).getResult();

			assert.equal(resultDrc.getNumRows(), 0);
		});

		QUnit.test('given ∀ operator with no tuple variable reference and true condition for all elements, should return all tuples', (assert) => {
			const queryDrc = '{ <a,b,c> | <a,b,c> in R and ∀s(<r,s> in S and s > 50) }';

			const resultDrc = exec_drc(queryDrc).getResult();
			const resultRa = srcTableR.getResult();

			assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∀ operator with tuple variable reference should return tuples that match the condition', (assert) => {
			const queryDrc1 = '{ <a,b,c> | <a,b,c> in R and ∀s(<r,s> in S ⇒ s < a) }';
			const queryDrc2 = '{ <a,b,c> | <a,b,c> in R and ∀s(<r,s> in S ⇒ s > a) }';

			const expectedResult1 = exec_ra('sigma a = 1000 (R)').getResult()
			const expectedResult2 = exec_ra('sigma a < 1000 (R)').getResult()

			const resultDrc1 = exec_drc(queryDrc1).getResult();
			const resultDrc2 = exec_drc(queryDrc2).getResult();

			assert.deepEqual(resultDrc1.getRows(), expectedResult1.getRows());
			assert.deepEqual(resultDrc2.getRows(), expectedResult2.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given ∀ operator with no tuple variable reference and true condition for some elements but not all, should return all tuples', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not ∀s(<r,s> in S and s > 300) }';

				const resultRa = srcTableR.getResult();
				const resultDrc = exec_drc(queryDrc).getResult();

				assert.deepEqual(resultDrc.getRows(), resultRa.getRows());
			});

			QUnit.test('given ∀ operator with no tuple variable reference and true condition for all elements, should return no tuples', (assert) => {
				const queryDrc = '{ <a,b,c> | <a,b,c> in R and not ∀s(<r,s> in S and s > 50) }';

				const resultDrc = exec_drc(queryDrc).getResult();

				assert.equal(resultDrc.getNumRows(), 0);
			});

			QUnit.test('given ∀ operator with tuple variable reference should return tuples that do not match the condition', (assert) => {
				const queryDrc1 = '{ <a,b,c> | <a,b,c> in R and not ∀s(<r,s> in S ⇒ s < a) }';
				const queryDrc2 = '{ <a,b,c> | <a,b,c> in R and not ∀s(<r,s> in S ⇒ s > a) }';

				const expectedResult1 = exec_ra('sigma a != 1000 (R)').getResult()
				const expectedResult2 = exec_ra('sigma a >= 1000 (R)').getResult()

				const resultDrc1 = exec_drc(queryDrc1).getResult();
				const resultDrc2 = exec_drc(queryDrc2).getResult();

				assert.deepEqual(resultDrc1.getRows(), expectedResult1.getRows());
				assert.deepEqual(resultDrc2.getRows(), expectedResult2.getRows());
			});
		});
	});
});