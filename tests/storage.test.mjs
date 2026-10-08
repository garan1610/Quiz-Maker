import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleBank } from '../lib/sample.ts';
import { compactBank, createAttempt, parseBank } from '../lib/quiz.ts';
import { checkedQuestions, navigateSession, selectSessionAnswer } from '../lib/session.ts';
import { restoreWorkspace, serializeWorkspace } from '../lib/storage.ts';

test('compact persistence restores shuffled order, selections, feedback, settings and source', () => {
  const settings = { sections: [...new Set(sampleBank.questions.map(q => q.section))], count: 6, mode: 'practice', shuffleAnswers: true, shuffleQuestions: true };
  const attempt = createAttempt(sampleBank, settings);
  const selected = attempt.questions[1].correctChoiceIds;
  attempt.answers[attempt.questions[1].id] = selected;
  const workspace = { version: 2, projects: [{ id: 'one', bank: sampleBank, settings, progress: { attempt, index: 1, selected, submitted: true, finished: false, checkedIds: [attempt.questions[1].id] } }], activeId: 'one', view: 'study' };
  const serialized = serializeWorkspace(workspace);
  assert.equal(JSON.parse(serialized).projects[0].progress.attempt.questions, undefined);
  assert.deepEqual(restoreWorkspace(JSON.parse(serialized)), workspace);
  workspace.projects[0].progress.finished = true;
  workspace.view = 'results';
  assert.equal(restoreWorkspace(JSON.parse(serializeWorkspace(workspace))).view, 'results');
});

test('corrupted references are rejected and missing active project recovers to library', () => {
  const settings = { sections: [sampleBank.questions[0].section], count: 1, mode: 'exam', shuffleQuestions: false, shuffleAnswers: false };
  const attempt = createAttempt(sampleBank, settings);
  const workspace = { version: 2, projects: [{ id: 'one', bank: sampleBank, progress: { attempt, index: 0, selected: [], submitted: false, finished: false, checkedIds: [] } }], activeId: 'one', view: 'study' };
  const raw = JSON.parse(serializeWorkspace(workspace));
  raw.projects[0].progress.attempt.questionOrder[0].choiceIds[0] = 'missing';
  assert.throws(() => restoreWorkspace(raw), /Invalid saved study session/);
  assert.equal(restoreWorkspace(JSON.parse(serializeWorkspace({ ...workspace, activeId: 'missing' }))).view, 'library');
});

test('public bank keeps all 200 questions and source answer text', () => {
  const raw = JSON.parse(readFileSync(new URL('../public/question-bank/Recall_Tu_tuong_Ho_Chi_Minh.json', import.meta.url), 'utf8'));
  const { bank, errors } = parseBank(JSON.stringify(raw));
  assert.deepEqual(errors, []);
  assert.equal(bank.questions.length, 200);
  for (let i = 0; i < 200; i++) {
    assert.equal(bank.questions[i].text, raw.questions[i].question);
    assert.equal(bank.questions[i].explanation, (raw.questions[i].explanation ?? ''));
    assert.deepEqual(compactBank(bank).questions[i].correct_answers, raw.questions[i].correct_answers);
  }
});

test('compact banks save without redundant IDs and restore edited source pages and shuffled progress', () => {
  const bank = parseBank(JSON.stringify(compactBank(sampleBank))).bank;
  bank.questions[0].source_page = 12;
  bank.questions[0].text += ' (edited)';
  const settings = { sections: [...new Set(bank.questions.map(q => q.section))], count: 6, mode: 'practice', shuffleAnswers: true, shuffleQuestions: true };
  const attempt = createAttempt(bank, settings);
  const workspace = { version: 2, projects: [{ id: 'one', bank, settings, progress: { attempt, index: 2, selected: attempt.questions[2].correctChoiceIds, submitted: false, finished: false, checkedIds: [] } }], activeId: 'one', view: 'study' };
  const serialized = serializeWorkspace(workspace);
  const saved = JSON.parse(serialized);
  assert.equal(saved.projects[0].bank.schemaVersion, 2);
  for (const q of saved.projects[0].bank.questions) {
    assert.equal(q.id, undefined);
    assert.equal(q.sourceNumber, undefined);
    assert.equal(q.answerShuffleSafe, undefined);
  }
  assert.deepEqual(restoreWorkspace(saved), workspace);
});

test('review bypass and omitted explanations survive localStorage serialization', () => {
  const compact = compactBank(sampleBank);
  delete compact.questions[0].explanation;
  compact.questions[0].correct_answers = [];
  const bank = parseBank(JSON.stringify(compact)).bank;
  const settings = { sections: [bank.questions[0].section], count: 1, mode: 'practice', shuffleAnswers: false, shuffleQuestions: false, skipReview: true };
  const attempt = createAttempt(bank, settings);
  const workspace = { version: 2, projects: [{ id: 'one', bank, progress: { attempt, index: 0, selected: [], submitted: false, finished: false, checkedIds: [] } }], activeId: 'one', view: 'study' };
  assert.deepEqual(restoreWorkspace(JSON.parse(serializeWorkspace(workspace))), workspace);
});

test('navigation preserves drafts separately from checked feedback across reloads', () => {
  const settings = { sections: [sampleBank.questions[0].section], count: 3, mode: 'practice', shuffleAnswers: true, shuffleQuestions: false };
  let session = { attempt: createAttempt(sampleBank, settings), index: 0, selected: [], submitted: false, finished: false, checkedIds: [] };
  session = selectSessionAnswer(session, '1_2');
  session = navigateSession(session, 2);
  session = selectSessionAnswer(session, '3_1');
  session = selectSessionAnswer(session, '3_3');
  session = navigateSession(session, 0);
  assert.deepEqual(session.selected, ['1_2']);
  assert.equal(session.submitted, false);
  assert.deepEqual(checkedQuestions(session), []);
  session = { ...session, submitted: true, checkedIds: ['1'] };
  session = navigateSession(session, 2);
  const workspace = { version: 2, projects: [{ id: 'one', bank: sampleBank, progress: session }], activeId: 'one', view: 'study' };
  session = restoreWorkspace(JSON.parse(serializeWorkspace(workspace))).projects[0].progress;
  assert.deepEqual(session.selected, ['3_1', '3_3']);
  assert.equal(session.submitted, false);
  session = navigateSession(session, 0);
  assert.equal(session.submitted, true);
  assert.deepEqual(selectSessionAnswer(session, '1_1').selected, ['1_2']);
  assert.equal(navigateSession(session, -1), session);
});
