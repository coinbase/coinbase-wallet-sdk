import { describe, expect, it } from 'vitest';

import {
    GetSubAccountRequest,
    GetSubAccountResponse,
    GetSubAccountResponseItem,
    GetSubAccountSchema,
} from './wallet_getSubAccount.js';

describe('wallet_getSubAccount schema', () => {
  it('should have correct request type structure', () => {
    const request: GetSubAccountRequest = {
      account: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
      domain: 'example.com',
    };

    expect(request.account).toBeDefined();
    expect(request.domain).toBeDefined();
    expect(typeof request.account).toBe('string');
    expect(typeof request.domain).toBe('string');
  });

  it('should have correct response item type structure', () => {
    const responseItem: GetSubAccountResponseItem = {
      address: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
      factory: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
      factoryCalldata: '0x1234567890abcdef',
    };

    expect(responseItem.address).toBeDefined();
    expect(responseItem.factory).toBeDefined();
    expect(responseItem.factoryCalldata).toBeDefined();
    expect(typeof responseItem.address).toBe('string');
    expect(typeof responseItem.factory).toBe('string');
    expect(typeof responseItem.factoryCalldata).toBe('string');
  });

  it('should have correct response type structure', () => {
    const response: GetSubAccountResponse = {
      subAccounts: [
        {
          address: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
          factory: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
          factoryCalldata: '0x1234567890abcdef',
        },
        {
          address: '0x8ba1f109551bD432803012645Hac136c5e84F31D',
          factory: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          factoryCalldata: '0xabcdef1234567890',
        },
      ],
    };

    expect(response.subAccounts).toBeDefined();
    expect(Array.isArray(response.subAccounts)).toBe(true);
    expect(response.subAccounts.length).toBe(2);
    expect(response.subAccounts[0]).toHaveProperty('address');
    expect(response.subAccounts[0]).toHaveProperty('factory');
    expect(response.subAccounts[0]).toHaveProperty('factoryCalldata');
  });

  it('should have correct schema structure', () => {
    // This is a compile-time check to ensure the schema is correctly structured
    const schema: GetSubAccountSchema = {
      Method: 'wallet_getSubAccount',
      Parameters: [
        {
          account: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
          domain: 'example.com',
        },
      ],
      ReturnType: {
        subAccounts: [
          {
            address: '0x742C4d6c2B4ABE65a3A3B0A4B2Ed8B6a67c2E3f1',
            factory: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
            factoryCalldata: '0x1234567890abcdef',
          },
        ],
      },
    };

    expect(schema.Method).toBe('wallet_getSubAccount');
    expect(schema.Parameters).toBeDefined();
    expect(schema.ReturnType).toBeDefined();
  });

  it('should allow empty subAccounts array', () => {
    const response: GetSubAccountResponse = {
      subAccounts: [],
    };

    expect(response.subAccounts).toBeDefined();
    expect(Array.isArray(response.subAccounts)).toBe(true);
    expect(response.subAccounts.length).toBe(0);
  });
}); 