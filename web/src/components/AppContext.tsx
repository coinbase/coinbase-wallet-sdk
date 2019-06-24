// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import React from "react"
import { MainRepository } from "../repositories/MainRepository"

export const AppContext = React.createContext<{
  mainRepo: MainRepository
}>({
  mainRepo: null as any // intentional
})
