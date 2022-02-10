// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { FunctionComponent, h } from "preact"

import css from "./Spinner-css"

export const Spinner: FunctionComponent<{
  size?: number
  color?: string
}> = props => {
  const size = props.size ?? 64
  const color = props.color || "#000"

  return (
    <div class="-walletlink-spinner">
      <style>{css}</style>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
      >
        <circle style={{ cx: 50, cy: 50, r: 45, stroke: color }} />
      </svg>
    </div>
  )
}
