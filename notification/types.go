// Copyright (c) 2019 Coinbase, Inc. See LICENSE

package notification

type sendParams struct {
	Secret  string            `json:"secret"`
	Address string            `json:"address"`
	Title   string            `json:"title"`
	Body    string            `json:"body"`
	Data    map[string]string `json:"data"`
}

type sendResponse struct {
	Error  sendResponseError  `json:"error,omitempty"`
	Result sendResponseResult `json:"result,omitempty"`
}

type sendResponseError struct {
	Message     string `json:"message"`
	Description string `json:"description"`
	Code        string `json:"code"`
}

type sendResponseResult struct {
	Sent bool `json:"sent"`
}
