// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

interface Tag<T extends string, RealType> {
  __tag__: T
  __realType__: RealType
}

export type OpaqueType<T extends string, U> = U & Tag<T, U>

export function OpaqueType<T extends Tag<any, any>>() {
  return (value: T extends Tag<any, infer U> ? U : never): T => value as T
}

export type HexString = OpaqueType<"HexString", string>
export const HexString = OpaqueType<HexString>()

export type AddressString = OpaqueType<"AddressString", string>
export const AddressString = OpaqueType<AddressString>()

export type IdNumber = OpaqueType<"IdNumber", number>
export const IdNumber = OpaqueType<IdNumber>()

export type BigIntString = OpaqueType<"BigIntString", string>
export const BigIntString = OpaqueType<BigIntString>()

export type IntNumber = OpaqueType<"IntNumber", number>
export const IntNumber = OpaqueType<IntNumber>()

export type RegExpString = OpaqueType<"RegExpString", string>
export const RegExpString = OpaqueType<RegExpString>()

export type Callback<T> = (err: Error | null, result: T | null) => void
