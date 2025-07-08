import { describe, expect, it } from 'vitest';

import {
  GetSubAccountsRequest,
  GetSubAccountsResponse,
  GetSubAccountsResponseItem,
} from './wallet_getSubAccount.js';

describe('wallet_getSubAccounts schema', () => {
  it('should have correct request type structure', () => {
    const request: GetSubAccountsRequest = {
      account: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
      domain: 'example.com',
    };

    expect(request.account).toBeDefined();
    expect(request.domain).toBeDefined();
    expect(typeof request.account).toBe('string');
    expect(typeof request.domain).toBe('string');
  });

  it('should have correct response item type structure', () => {
    const responseItem: GetSubAccountsResponseItem = {
      address: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
      factory: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
      factoryData: '0x1234567890abcdef',
    };

    expect(responseItem.address).toBeDefined();
    expect(responseItem.factory).toBeDefined();
    expect(responseItem.factoryData).toBeDefined();
    expect(typeof responseItem.address).toBe('string');
    expect(typeof responseItem.factory).toBe('string');
    expect(typeof responseItem.factoryData).toBe('string');
  });

  it('should have correct response type structure', () => {
    const response: GetSubAccountsResponse = {
      subAccounts: [
        {
          address: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
          factory: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
          factoryData: '0x1234567890abcdef',
        },
        {
          address: '0x8ba1f109551bD432803012645Hac136c5e84F31D',
          factory: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          factoryData: '0xabcdef1234567890',
        },
      ],
    };

    expect(response.subAccounts).toBeDefined();
    expect(Array.isArray(response.subAccounts)).toBe(true);
    expect(response.subAccounts.length).toBe(2);
    expect(response.subAccounts[0]).toHaveProperty('address');
    expect(response.subAccounts[0]).toHaveProperty('factory');
    expect(response.subAccounts[0]).toHaveProperty('factoryData');
  });

  it('should allow empty subAccounts array', () => {
    const response: GetSubAccountsResponse = {
      subAccounts: [],
    };

    expect(response.subAccounts).toBeDefined();
    expect(Array.isArray(response.subAccounts)).toBe(true);
    expect(response.subAccounts.length).toBe(0);
  });
});
