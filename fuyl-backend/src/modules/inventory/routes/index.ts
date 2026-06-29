import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { inventoryController } from '../controllers';

const router = Router();

// Stock queries
router.get('/inventory/stock/:productId', authRequired, inventoryController.getStock);
router.get('/inventory/mine', authRequired, authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.listMine);
router.get('/inventory/low-stock', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.listLowStock);

// Adjustments
router.post('/inventory/adjust', authRequired, authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.adjust);
router.put('/inventory/reorder/:productId', authRequired, authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.setReorder);

// Reservations (called internally by checkout module)
router.post('/inventory/reserve', authRequired, inventoryController.reserve);
router.post('/inventory/release', authRequired, inventoryController.release);

// Movements
router.get('/inventory/movements', authRequired, authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.listMovements);

// Health
router.get('/inventory/health', (_req, res) => {
  res.json({ success: true, module: 'inventory', status: 'active' });
});

export default router;
