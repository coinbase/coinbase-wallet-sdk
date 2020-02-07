// Copyright (c) 2018-2019 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2019 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import crypto from "crypto"

export function encrypt(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(secret, "hex"),
    iv
  )
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plainText, "utf8")),
    cipher.final()
  ])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("hex")
}

export function decrypt(cipherText: string, secret: string): string {
  const buf = Buffer.from(cipherText, "hex")
  const iv = buf.slice(0, 12)
  const authTag = buf.slice(12, 28)
  const encrypted = buf.slice(28)
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(secret, "hex"),
    iv
  )
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  )
}
