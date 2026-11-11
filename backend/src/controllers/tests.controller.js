import * as testsService from '../services/tests.service.js';
import { success, created } from '../utils/response.js';

export async function createTest(req, res, next) {
  try {
    const test = await testsService.createTest(req.user.id, req.body);
    return created(res, test, 'Test created.');
  } catch (err) { next(err); }
}

export async function getTests(req, res, next) {
  try {
    const data = await testsService.getTests(req.user.id, req.user.role);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getTest(req, res, next) {
  try {
    const data = await testsService.getTestForTaking(req.params.id, req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function publishTest(req, res, next) {
  try {
    const test = await testsService.publishTest(req.params.id, req.user.id);
    return success(res, test, 'Test published.');
  } catch (err) { next(err); }
}

export async function assignTest(req, res, next) {
  try {
    const assignment = await testsService.assignTest(req.params.id, req.user.id, req.body);
    return created(res, assignment, 'Test assigned.');
  } catch (err) { next(err); }
}

export async function startAttempt(req, res, next) {
  try {
    const attempt = await testsService.startAttempt(req.params.id, req.user.id);
    return success(res, attempt, 'Attempt started.', 201);
  } catch (err) { next(err); }
}

export async function submitAttempt(req, res, next) {
  try {
    const result = await testsService.submitAttempt(req.params.attemptId, req.user.id, req.body.answers);
    return success(res, result, 'Test submitted and scored.');
  } catch (err) { next(err); }
}

export async function getAttemptResult(req, res, next) {
  try {
    const result = await testsService.getAttemptResult(req.params.attemptId, req.user.id);
    return success(res, result);
  } catch (err) { next(err); }
}

export async function getTestLibrary(req, res, next) {
  try {
    const { topic, difficulty } = req.query;
    const tests = await testsService.getTestLibrary({ topic, difficulty });
    return success(res, tests);
  } catch (err) { next(err); }
}
