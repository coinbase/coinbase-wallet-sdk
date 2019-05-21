// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import crypto from "crypto"

export function encrypt(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(secret, "hex"),
    iv
  )
  return Buffer.concat([
    iv,
    cipher.update(Buffer.from(plainText, "utf8")),
    cipher.final()
  ]).toString("hex")
}

export function decrypt(cipherText: string, secret: string): string {
  const buf = Buffer.from(cipherText, "hex")
  const iv = buf.slice(0, 12)
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(secret, "hex"),
    iv
  )
  return Buffer.concat([
    decipher.update(buf.slice(12)),
    decipher.final()
  ]).toString("utf8")
}
