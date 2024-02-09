import { ProviderInterface } from '../provider/ProviderInterface';

export const mockProvider = {
  request: jest.fn(),
  on: jest.fn(),
  eventNames: jest.fn(),
  listeners: jest.fn(),
  listenerCount: jest.fn(),
  emit: jest.fn(),
  addListener: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
} as ProviderInterface;
