import * as analyticsService from '../services/analytics.service.js';
import { success } from '../utils/response.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await analyticsService.getDashboardStats(req.user.id, req.user.role);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getPnlChart(req, res, next) {
  try {
    const data = await analyticsService.getPnlChart(req.user.id, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getStrategyPerformance(req, res, next) {
  try {
    const data = await analyticsService.getStrategyPerformance(req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}
