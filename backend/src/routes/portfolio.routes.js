import { Router } from 'express';
import * as portfolioController from '../controllers/portfolio.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { placeOrderSchema } from '../validators/portfolio.validators.js';

const router = Router();
router.use(authenticate);

router.get('/', portfolioController.getPortfolio);
router.post('/orders', validate(placeOrderSchema), portfolioController.placeOrder);
router.get('/orders', portfolioController.getOrderHistory);
router.get('/trades', portfolioController.getTradeHistory);
router.post('/reset', portfolioController.resetPortfolio);
router.post('/positions/:positionId/close', portfolioController.closePosition);
router.post('/refresh-pnl', portfolioController.refreshPnl);

export default router;
