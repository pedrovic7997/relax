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

	// QUnit.module('Formulae ordering', () => {});

	// QUnit.module('Logical implication', () => {

	// 	QUnit.module('Negation', () => {});
	// });

	// QUnit.module('Logical biconditional (equivalence)', () => {
	// 	QUnit.module('Negation', () => {});
	// });

	QUnit.module('Predicates', () => {
		QUnit.module('Conjunction', () => {
			QUnit.test('Multiple relations with binding predicate', assert => {
				const queryDrc = '{ <x,y,z,r,s> | <x,y,z> in R and <r,s> in S and y=r}';
				const queryRa = 'π R.x, R.y, R.z, S.r, S.s ( ( ρ x←a, y←b, z←c R ⨯ ρ r←b, s←d S ) ∩ σ y = r ( ρ x←a, y←b, z←c R ⨯ ρ r←b, s←d S ) ) ';

				const resultDrc = exec_drc(queryDrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultDrc, resultRa);
			})
	// 		QUnit.module('Negation', () => {});
		});

	// 	QUnit.module('Disjunction', () => {
	// 		QUnit.module('Negation', () => {});
	// 	});

	// 	QUnit.module('Exclusive disjunction', () => {});

	// 	QUnit.module('Negation', () => {})

	// 	QUnit.module('Comparison', () => {})
	});

	// QUnit.module('existencial quantifier operator(∃)', () => {
	// 	QUnit.module('Negation', () => {});
	// });

	// QUnit.module('universal quantifier operator(∀)', () => {
	// 	QUnit.module('Negation', () => {});
	// });
});