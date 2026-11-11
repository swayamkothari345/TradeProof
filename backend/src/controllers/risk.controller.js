import * as riskService from '../services/risk.service.js';
import { success } from '../utils/response.js';

export function positionSize(req, res, next) {
  try {
    const result = riskService.calculatePositionSize(req.body);
    return success(res, result);
  } catch (err) { next(err); }
}

export function riskReward(req, res, next) {
  try {
    const result = riskService.calculateRiskReward(req.body);
    return success(res, result);
  } catch (err) { next(err); }
}

export function checklist(req, res, next) {
  try {
    const result = riskService.evaluateChecklist(req.body);
    return success(res, result);
  } catch (err) { next(err); }
}
