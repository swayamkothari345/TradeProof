import * as aicoachService from '../services/aicoach.service.js';
import { success } from '../utils/response.js';

export async function generate(req, res, next) {
  try {
    const analysis = await aicoachService.generateAnalysis(req.user.id);
    return success(res, analysis, 'Analysis generated.');
  } catch (err) { next(err); }
}

export async function getLatest(req, res, next) {
  try {
    const analysis = await aicoachService.getLatestAnalysis(req.user.id);
    return success(res, analysis);
  } catch (err) { next(err); }
}
