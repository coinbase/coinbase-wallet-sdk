// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import querystring from "querystring"
import React, { ComponentType } from "react"
import { RouteComponentProps } from "react-router"

export interface AppInfo {
  appName: string
  appLogoUrl: string
  origin: string
}

export interface RouteComponentPropsWithAppInfo extends RouteComponentProps {
  appInfo: AppInfo
}

export function routeWithAppInfo(
  RouteComponent: ComponentType<RouteComponentPropsWithAppInfo>
) {
  return (props: RouteComponentProps) => {
    const appInfo = parseQuery(props.location.search.slice(1))
    return <RouteComponent {...props} appInfo={appInfo} />
  }
}

function parseQuery(qs: string): AppInfo {
  const query = querystring.parse(qs)
  const { appName, appLogoUrl, origin } = query
  return {
    appName: firstValue(appName),
    appLogoUrl: firstValue(appLogoUrl),
    origin: firstValue(origin)
  }
}

function firstValue(val: string[] | string): string {
  return (Array.isArray(val) ? val[0] : val) || ""
}
