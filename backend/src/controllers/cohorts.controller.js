import * as cohortsService from '../services/cohorts.service.js';
import { success, created } from '../utils/response.js';

export async function getCohorts(req, res, next) {
  try {
    const data = await cohortsService.getCohorts(req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function createCohort(req, res, next) {
  try {
    const cohort = await cohortsService.createCohort(req.user.id, req.body);
    return created(res, cohort, 'Cohort created.');
  } catch (err) { next(err); }
}

export async function deleteCohort(req, res, next) {
  try {
    await cohortsService.deleteCohort(req.user.id, req.params.id);
    return success(res, null, 'Cohort archived.');
  } catch (err) { next(err); }
}

export async function getCohortMembers(req, res, next) {
  try {
    const data = await cohortsService.getCohortMembers(req.user.id, req.params.id);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getInstituteStudents(req, res, next) {
  try {
    const data = await cohortsService.getInstituteStudents(req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}
