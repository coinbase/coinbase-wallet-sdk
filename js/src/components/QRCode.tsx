// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { FunctionComponent, h } from "preact"
import { useEffect, useState } from "preact/hooks"
import QRCodeSVG from "../vendor-js/qrcode-svg"

export interface QRCodeProps {
  content: string
  width?: number
  height?: number
  fgColor?: string
  bgColor?: string
  image?: QRCodeSVG.SvgLogo
}

export const QRCode: FunctionComponent<QRCodeProps> = props => {
  const [svg, setSvg] = useState("")

  useEffect(() => {
    const qrcode = new QRCodeSVG({
      content: props.content,
      background: props.bgColor || "#ffffff",
      color: props.fgColor || "#000000",
      container: "svg",
      ecl: "M",
      width: props.width ?? 256,
      height: props.height ?? 256,
      padding: 0,
      image: props.image
    })
    const base64 = Buffer.from(qrcode.svg(), "utf8").toString("base64")
    setSvg(`data:image/svg+xml;base64,${base64}`)
  })

  return svg ? <img src={svg} alt="QR Code" /> : null
}
