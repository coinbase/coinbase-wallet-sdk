// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import React, { MouseEvent } from "react"
import { style } from "typestyle"

export interface Props {
  appName: string
  appLogoUrl: string
  origin: string
  disabled: boolean
  onClickAllowButton: () => void
  onClickDontAllowButton: () => void
}

const styles = {
  main: style({
    textAlign: "center",
    width: 320,
    margin: "0 auto",
    padding: 16
  }),
  logoDiv: style({
    width: 128,
    height: 128,
    margin: "0 auto",
    borderRadius: 64,
    overflow: "hidden",
    backgroundColor: "#eee"
  }),
  logoImage: style({
    width: 128,
    height: 128,
    backgroundSize: "cover"
  }),
  origin: style({
    fontSize: 12
  })
}

export class AuthorizePage extends React.PureComponent<Props> {
  public render() {
    const { appName, appLogoUrl, origin, disabled } = this.props

    return (
      <div className={styles.main}>
        <div className={styles.logoDiv}>
          {appLogoUrl ? (
            <img className={styles.logoImage} src={appLogoUrl} alt="" />
          ) : null}
        </div>
        <p className={styles.origin}>{origin.replace(/^https?:\/\//, "")}</p>

        <h3>{appName} would like to connect to your account</h3>

        <p>Would you like to view your wallet address.</p>

        <button onClick={this.handleClickDontAllowButton} disabled={disabled}>
          Don&rsquo;t Allow
        </button>
        <button onClick={this.handleClickAllowButton} disabled={disabled}>
          Allow
        </button>
      </div>
    )
  }

  @bind
  private handleClickAllowButton(e: MouseEvent) {
    e.preventDefault()
    const { onClickAllowButton } = this.props
    if (onClickAllowButton) {
      onClickAllowButton()
    }
  }

  @bind
  private handleClickDontAllowButton(e: MouseEvent) {
    e.preventDefault()
    const { onClickDontAllowButton } = this.props
    if (onClickDontAllowButton) {
      onClickDontAllowButton()
    }
  }
}
