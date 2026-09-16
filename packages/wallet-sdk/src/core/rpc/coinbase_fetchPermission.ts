import { SpendPermission } from './coinbase_fetchSpendPermissions.js';

export type FetchPermissionRequest = {
  method: 'coinbase_fetchPermission';
  params: [{ permissionHash: string }];
};

export type FetchPermissionResponse = {
  permission: SpendPermission;
};
