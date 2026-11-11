import * as scenariosService from '../services/scenarios.service.js';
import { success, created } from '../utils/response.js';

export async function listScenarios(req, res, next) {
  try {
    const { type, difficulty, instrument } = req.query;
    const data = await scenariosService.listScenarios({ type, difficulty, instrument });
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getScenario(req, res, next) {
  try {
    const data = await scenariosService.getScenario(req.params.slugOrId, req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function startAttempt(req, res, next) {
  try {
    const attempt = await scenariosService.startAttempt(req.params.id, req.user.id);
    return success(res, attempt, 'Attempt started.', 201);
  } catch (err) { next(err); }
}

export async function submitAttempt(req, res, next) {
  try {
    const result = await scenariosService.submitAttempt(req.params.attemptId, req.user.id, req.body);
    return success(res, result, 'Attempt submitted and scored.');
  } catch (err) { next(err); }
}

export async function getUserAttempts(req, res, next) {
  try {
    const { type } = req.query;
    const data = await scenariosService.getUserAttempts(req.user.id, type);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getAttemptReview(req, res, next) {
  try {
    const data = await scenariosService.getAttemptReview(req.params.attemptId, req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function createScenario(req, res, next) {
  try {
    const scenario = await scenariosService.createScenario(req.user.id, req.body);
    return created(res, scenario, 'Scenario created.');
  } catch (err) { next(err); }
}

export async function getMentorScenarios(req, res, next) {
  try {
    const data = await scenariosService.getMentorScenarios(req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function publishScenario(req, res, next) {
  try {
    const scenario = await scenariosService.publishScenario(req.params.id, req.user.id);
    return success(res, scenario, 'Scenario published.');
  } catch (err) { next(err); }
}
