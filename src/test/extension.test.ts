import * as assert from 'assert';
import * as jest from 'jest'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

import { decompileCode } from '../extension';
import { leb128EncodeUnsigned, leb128DecodeUnsigned } from '../leb128';

test('leb128', () => {
	const sample = 624485 >> 0;
	const encoding = Array.from(leb128EncodeUnsigned(sample))
	console.log(encoding)
	assert.strictEqual(encoding.length, 3)
	assert.deepStrictEqual(encoding, [0xe5, 0x8e, 0x26], 'wikipedia example')
	const decoding = leb128DecodeUnsigned(encoding)
	assert.strictEqual(decoding, sample)
})