// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { MainRepository } from "../repositories/MainRepository"

export const AppContext = React.createContext<{
  mainRepo: MainRepository | null
}>({
  mainRepo: null
})
