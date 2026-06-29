import { IRole, RoleModel } from '../models/role.model';
import { IPermission, PermissionModel } from '../models/permission.model';

export class RoleRepository {
  async findByName(name: string): Promise<IRole | null> {
    return RoleModel.findOne({ name: name.toLowerCase() });
  }

  async findById(id: string): Promise<IRole | null> {
    return RoleModel.findById(id);
  }

  async findAll() {
    return RoleModel.find().sort({ name: 1 });
  }

  async create(data: Partial<IRole>): Promise<IRole> {
    return RoleModel.create(data);
  }

  async update(id: string, patch: Partial<IRole>): Promise<IRole | null> {
    return RoleModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async delete(id: string): Promise<void> {
    const role = await RoleModel.findById(id);
    if (role?.isSystem) throw new Error('Cannot delete system role');
    await RoleModel.findByIdAndDelete(id);
  }
}

export class PermissionRepository {
  async findByName(name: string): Promise<IPermission | null> {
    return PermissionModel.findOne({ name });
  }

  async findAll() {
    return PermissionModel.find().sort({ module: 1, action: 1 });
  }

  async findByModule(mod: string) {
    return PermissionModel.find({ module: mod });
  }

  async create(data: Partial<IPermission>): Promise<IPermission> {
    return PermissionModel.create(data);
  }
}
