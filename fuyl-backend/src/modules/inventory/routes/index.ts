import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { requirePermission, Permissions } from '../../../shared/middleware/rbac.middleware';
import { inventoryController } from '../controllers';

const router = Router();

// Stock queries — public so the storefront can cap quantity selectors
router.get('/inventory/stock/:productId', inventoryController.getStock);
router.get('/inventory/mine', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.listMine);
router.get('/inventory/low-stock', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.listLowStock);
router.get('/admin/inventory', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.listAllForAdmin);

// Adjustments
router.post('/inventory/adjust', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.adjust);
router.put('/inventory/reorder/:productId', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.setReorder);

// Reservations (called internally by checkout module)
router.post('/inventory/reserve', authRequired, inventoryController.reserve);
router.post('/inventory/release', authRequired, inventoryController.release);

// Warehouse locations
router.get('/inventory/locations',        authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.listLocations);
router.post('/inventory/locations',       authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.createLocation);
router.put('/inventory/locations/:id',    authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.updateLocation);
router.delete('/inventory/locations/:id', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.deleteLocation);

// Stats
router.get('/inventory/stats/consumption', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.consumptionStats);

// Movements
router.get('/inventory/movements', authRequired, requirePermission(Permissions.INVENTORY_MANAGE), inventoryController.listMovements);

// Health
router.get('/inventory/health', (_req, res) => {
  res.json({ success: true, module: 'inventory', status: 'active' });
});

export default router;
