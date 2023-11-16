// DiagnosticLogger for debugging purposes only

import { ConnectionState } from '../relay/walletlink/connection/WalletLinkWebSocket';
import { ServerMessage } from '../relay/walletlink/type/ServerMessage';
import { WalletLinkEventData } from '../relay/walletlink/type/WalletLinkEventData';

export type LogProperties = {
  addresses_length?: number; // number of eth addresses
  alreadyDestroyed?: boolean; // error flag if metadata is already destroyed on resetAndReload
  eventId?: WalletLinkEventData['id'];
  isSessionMismatched?: string; // storedSession does not match sessionId
  linked?: ServerMessage<'IsLinkedOK'>['linked'];
  message?: string; // error message
  metadata_keys?: string[]; // session config metadata keys
  method?: string; // method throwing error message
  onlineGuests?: number; // number of online guests (should be 0 or 1)
  sessionIdHash?: string; // anonymous session id for debugging specific sessions
  sessionMetadataChange?: string; // change in session metadata
  state?: ConnectionState;
  storedSessionIdHash?: string; // anonymous session id from localStorage
  type?: ServerMessage['type'];
  value?: string; // error value associated with the message
};

type Keys = keyof typeof EVENTS;
export type EventType = (typeof EVENTS)[Keys];

export interface DiagnosticLogger {
  log(eventType: EventType, logProperties?: LogProperties): void;
}

export const EVENTS = {
  STARTED_CONNECTING: 'walletlink_sdk.started.connecting',
  CONNECTED_STATE_CHANGE: 'walletlink_sdk.connected',
  DISCONNECTED: 'walletlink_sdk.disconnected',
  METADATA_DESTROYED: 'walletlink_sdk_metadata_destroyed',
  LINKED: 'walletlink_sdk.linked',
  FAILURE: 'walletlink_sdk.generic_failure',
  SESSION_CONFIG_RECEIVED: 'walletlink_sdk.session_config_event_received',
  ETH_ACCOUNTS_STATE: 'walletlink_sdk.eth_accounts_state',
  SESSION_STATE_CHANGE: 'walletlink_sdk.session_state_change',
  UNLINKED_ERROR_STATE: 'walletlink_sdk.unlinked_error_state',
  SKIPPED_CLEARING_SESSION: 'walletlink_sdk.skipped_clearing_session',
  GENERAL_ERROR: 'walletlink_sdk.general_error',
  WEB3_REQUEST: 'walletlink_sdk.web3.request',
  WEB3_REQUEST_PUBLISHED: 'walletlink_sdk.web3.request_published',
  WEB3_RESPONSE: 'walletlink_sdk.web3.response',
  METHOD_NOT_IMPLEMENTED: 'walletlink_sdk.method_not_implemented',
  UNKNOWN_ADDRESS_ENCOUNTERED: 'walletlink_sdk.unknown_address_encountered',
};
