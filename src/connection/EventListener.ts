export interface EventListener {
  onEvent(eventType: string, eventProperties?: any): void
}

export const EVENTS = {
  REQUEST_CHILD_ETHEREUM_ACCOUNTS_START: "cbwsdk.request_child_ethereum_accounts.start",
  REQUEST_CHILD_ETHEREUM_ACCOUNTS_RESPONSE: "cbwsdk.request_child_ethereum_accounts.response",
  STARTED_CONNECTING: "cbwsdk.started.connecting",
  CONNECTED_STATE_CHANGE: "cbwsdk.connected",
  DISCONNECTED: "cbwsdk.disconnected",
  METADATA_DESTROYED: "cbwsdk_metadata_destroyed",
  LINKED: "cbwsdk.linked",
  FAILURE: "cbwsdk.generic_failure",
  SESSION_CONFIG_RECEIVED: "cbwsdk.session_config_event_received",
  ETH_ACCOUNTS_STATE: "cbwsdk.eth_accounts_state",
  SESSION_STATE_CHANGE: "cbwsdk.session_state_change",
  UNLINKED_ERROR_STATE: "cbwsdk.unlinked_error_state",
  SKIPPED_CLEARING_SESSION: "cbwsdk.skipped_clearing_session",
  GENERAL_ERROR: "cbwsdk.general_error",
  WEB3_REQUEST: "cbwsdk.web3.request",
  WEB3_REQUEST_PUBLISHED: "cbwsdk.web3.request_published",
  WEB3_RESPONSE: "cbwsdk.web3.response",
  UNKNOWN_ADDRESS_ENCOUNTERED: "cbwsdk.unknown_address_encountered"
}
