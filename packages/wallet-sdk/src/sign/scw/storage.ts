import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';

export const scwSignerStorage = new ScopedLocalStorage('CBWSDK', 'SCWStateManager');

export const ACCOUNTS_KEY = 'accounts';
export const SUB_ACCOUNTS_KEY = 'subAccounts';
export const ACTIVE_SUB_ACCOUNT_ID_KEY = 'activeSubAccountId';
export const ACTIVE_CHAIN_STORAGE_KEY = 'activeChain';
export const AVAILABLE_CHAINS_STORAGE_KEY = 'availableChains';
export const WALLET_CAPABILITIES_STORAGE_KEY = 'walletCapabilities';
