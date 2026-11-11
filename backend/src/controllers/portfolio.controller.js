import * as portfolioService from '../services/portfolio.service.js';
import { success, created } from '../utils/response.js';

export async function getPortfolio(req, res, next) {
  try {
    const data = await portfolioService.getPortfolio(req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function placeOrder(req, res, next) {
  try {
    const order = await portfolioService.placeOrder(req.user.id, req.body);
    return success(res, order, 'Order placed and filled.', 201);
  } catch (err) { next(err); }
}

export async function getOrderHistory(req, res, next) {
  try {
    const data = await portfolioService.getOrderHistory(req.user.id, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getTradeHistory(req, res, next) {
  try {
    const data = await portfolioService.getTradeHistory(req.user.id, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function resetPortfolio(req, res, next) {
  try {
    const result = await portfolioService.resetPortfolio(req.user.id);
    return success(res, result, result.message);
  } catch (err) { next(err); }
}

export async function closePosition(req, res, next) {
  try {
    const order = await portfolioService.closePosition(req.user.id, req.params.positionId);
    return success(res, order, 'Position closed.');
  } catch (err) { next(err); }
}

export async function refreshPnl(req, res, next) {
  try {
    await portfolioService.refreshUnrealisedPnl(req.user.id);
    const data = await portfolioService.getPortfolio(req.user.id);
    return success(res, data);
  } catch (err) { next(err); }
}
