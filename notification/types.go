// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package notification

// SendResponse - send call server response
type SendResponse struct {
	Error  SendResponseError  `json:"error,omitempty"`
	Result SendResponseResult `json:"result,omitempty"`
}

// SendResponseResult - send call server response result
type SendResponseResult struct {
	Sent bool `json:"sent"`
}

// SendResponseError - send call server response error
type SendResponseError struct {
	Message     string `json:"message"`
	Description string `json:"description"`
	Code        string `json:"code"`
}

type sendParams struct {
	Secret   string            `json:"secret"`
	PushID   string            `json:"pushId"`
	Title    string            `json:"title"`
	Body     string            `json:"body"`
	Data     map[string]string `json:"data"`
	Category string            `json:"category"`
}
