import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import { inventoryController } from '../controllers';

const router = Router();

// Stock queries — public so the storefront can cap quantity selectors
router.get('/inventory/stock/:productId', inventoryController.getStock);
router.get('/inventory/mine', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.listMine);
router.get('/inventory/low-stock', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.listLowStock);
router.get('/admin/inventory', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.listAllForAdmin);

// Adjustments
router.post('/inventory/adjust', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.adjust);
router.put('/inventory/reorder/:productId', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.setReorder);

// Reservations (called internally by checkout module)
router.post('/inventory/reserve', authRequired, inventoryController.reserve);
router.post('/inventory/release', authRequired, inventoryController.release);

// Warehouse locations
router.get('/inventory/locations',        authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.listLocations);
router.post('/inventory/locations',       authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.createLocation);
router.put('/inventory/locations/:id',    authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.updateLocation);
router.delete('/inventory/locations/:id', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.deleteLocation);

// Stats
router.get('/inventory/stats/consumption', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.consumptionStats);

// Movements
router.get('/inventory/movements', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), inventoryController.listMovements);

// Health
router.get('/inventory/health', (_req, res) => {
  res.json({ success: true, module: 'inventory', status: 'active' });
});

export default router;
