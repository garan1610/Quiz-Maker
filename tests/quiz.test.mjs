import test from 'node:test';
import assert from 'node:assert/strict';
import { compactBank, parseBank, createAttempt, isCorrect, needsReview, reviewOrder, shuffled } from '../lib/quiz.ts';
import { sampleBank } from '../lib/sample.ts';

const settings = { sections: ['Memory & practice', 'Building understanding'], count: 6, shuffleQuestions: false, shuffleAnswers: false, mode: 'practice' };
const parse = (value) => parseBank(JSON.stringify(value));

test('imports the single format, preserving wording and generating stable IDs', () => {
  const input = compactBank(sampleBank);
  assert.deepEqual(parse(input).bank, sampleBank);
  input.questions[0].question = 'Câu hỏi:\nI. Hồ Chí Minh\nII. "Kiến thức"';
  const bank = parse(input).bank;
  assert.equal(bank.questions[0].text, input.questions[0].question);
  assert.deepEqual(bank.questions.map(q => q.id), ['1', '2', '3', '4', '5', '6']);
  assert.ok(parseBank('```json\n' + JSON.stringify(input) + '\n```').bank);
});

test('rejects unsupported versions, malformed files, and invalid answer references', () => {
  for (const version of [undefined, 1, 3, '2']) assert.equal(parse({ ...compactBank(sampleBank), schemaVersion: version }).bank, null);
  for (const raw of ['{', '[]', '{}', 'x'.repeat(5_000_001)]) assert.equal(parseBank(raw).bank, null);
  for (const correct_answers of [['Z'], ['A', 'A'], 'A']) {
    const input = compactBank(sampleBank);
    input.questions[0].correct_answers = correct_answers;
    assert.equal(parse(input).bank, null);
  }
});

test('optional explanations and pages round-trip without review flags', () => {
  const input = compactBank(sampleBank);
  delete input.questions[0].explanation;
  input.questions[0].source_page = 7;
  const bank = parse(input).bank;
  assert.equal(bank.questions[0].explanation, '');
  assert.equal(needsReview(bank.questions[0]), false);
  assert.deepEqual(compactBank(bank), input);
  for (const source_page of ['3', 0, -1, 1.5, null]) {
    input.questions[0].source_page = source_page;
    assert.equal(parse(input).bank, null);
  }
});

test('missing answers require review unless explicitly bypassed', () => {
  const input = compactBank(sampleBank);
  input.questions[0].correct_answers = [];
  const bank = parse(input).bank;
  assert.ok(needsReview(bank.questions[0]));
  assert.throws(() => createAttempt(bank, settings), /Resolve flagged/);
  const attempt = createAttempt(bank, { ...settings, skipReview: true });
  assert.deepEqual(attempt.questions[0].correctChoiceIds, []);
  assert.equal(isCorrect(attempt.questions[0], ['1_1']), false);
});

test('explicit exceptions and relative wording prevent unsafe answer shuffling', () => {
  const input = compactBank(sampleBank);
  input.questions[0].answers.D = 'All of the above';
  input.questions[1].question = 'Which statement explains why option A is correct?';
  input.questions[2].answerShuffleSafe = false;
  const bank = parse(input).bank;
  const attempt = createAttempt(bank, { ...settings, shuffleAnswers: true });
  for (let i = 0; i < 3; i++) {
    assert.equal(bank.questions[i].answerShuffleSafe, false);
    assert.deepEqual(attempt.questions[i].choices, bank.questions[i].choices);
  }
  assert.equal(compactBank(bank).questions[3].answerShuffleSafe, undefined);
});

test('shuffling preserves exact-set grading and source bank', () => {
  const before = JSON.stringify(sampleBank);
  const attempt = createAttempt(sampleBank, { ...settings, shuffleQuestions: true, shuffleAnswers: true });
  for (const q of attempt.questions) {
    assert.ok(isCorrect(q, [...q.correctChoiceIds].reverse()));
    assert.equal(isCorrect(q, []), false);
  }
  const multi = attempt.questions.find(q => q.type === 'multiple_choice');
  assert.equal(isCorrect(multi, [multi.correctChoiceIds[0]]), false);
  assert.equal(isCorrect(multi, [multi.correctChoiceIds[0], multi.correctChoiceIds[0]]), false);
  assert.equal(JSON.stringify(sampleBank), before);
  assert.notDeepEqual(shuffled([1, 2, 3, 4], () => 0), [1, 2, 3, 4]);
});

test('review orders mistakes first and sessions respect sections and count', () => {
  const attempt = createAttempt(sampleBank, settings);
  attempt.answers['1'] = ['1_2'];
  attempt.answers['2'] = ['2_1'];
  attempt.answers['3'] = ['3_1', '3_3'];
  assert.deepEqual(reviewOrder(attempt).map(q => q.id), ['2', '4', '5', '6', '1', '3']);
  assert.equal(createAttempt(sampleBank, { ...settings, sections: ['Building understanding'], count: 2 }).questions.length, 2);
  for (const count of [0, -1, 1.5, 7, NaN]) assert.throws(() => createAttempt(sampleBank, { ...settings, count }));
  assert.throws(() => createAttempt(sampleBank, { ...settings, sections: [] }));
});
