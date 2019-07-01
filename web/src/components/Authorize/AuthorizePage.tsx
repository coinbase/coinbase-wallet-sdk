// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator"
import classNames from "classnames"
import React, { MouseEvent } from "react"
import { style } from "typestyle"
import { colors } from "../../colors"

export interface Props {
  appName: string
  appLogoUrl: string
  origin: string
  fromLinkPage: boolean
  disabled: boolean
  onClickAllowButton: () => void
  onClickDontAllowButton: () => void
}

const APP_LOGO_IMAGE_SIZE = 96

const styles = {
  main: style({
    textAlign: "center",
    width: 320,
    margin: "0 auto",
    padding: 16
  }),
  step: style({
    textTransform: "uppercase",
    color: "#808080",
    margin: 0
  }),
  title: style({
    fontSize: 20,
    marginTop: 4,
    marginBottom: 0
  }),
  origin: style({
    fontSize: 13,
    fontWeight: "normal",
    marginTop: 4,
    marginBottom: 0
  }),
  logoCircle: style({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: APP_LOGO_IMAGE_SIZE,
    height: APP_LOGO_IMAGE_SIZE,
    marginTop: 32,
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: 32,
    borderRadius: Math.floor(APP_LOGO_IMAGE_SIZE / 2),
    overflow: "hidden",
    backgroundColor: "white",
    backgroundSize: "cover",
    boxShadow:
      "0px 16px 24px rgba(0, 0, 0, 0.06), 0px 0px 8px rgba(0, 0, 0, 0.04)",
    fontSize: Math.floor(APP_LOGO_IMAGE_SIZE / 2),
    fontWeight: "bold",
    color: "#bbb"
  }),
  logoImage: style({
    width: APP_LOGO_IMAGE_SIZE,
    height: APP_LOGO_IMAGE_SIZE,
    backgroundSize: "cover"
  }),
  content: style({
    width: 256,
    marginBottom: 104,
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "left"
  }),
  permissionListTitle: style({
    margin: 0,
    fontSize: 16
  }),
  permissionList: style({
    margin: 0,
    padding: 0,
    listStyle: "none",
    fontSize: 13
  }),
  permissionListItem: style({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16
  }),
  permissionListIcon: style({
    marginRight: 12
  }),
  permissionInfo: style({
    marginTop: 32,
    fontSize: 13,
    color: "#808080"
  }),
  buttons: style({
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    flexDirection: "row",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, .8)"
  }),
  button: style({
    height: 56,
    flex: 1,
    boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.125)",
    appearance: "none",
    "-webkit-appearance": "none",
    border: "none",
    borderRadius: 16,
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginRight: 12,
    userSelect: "none",
    transition: "opacity .1s",
    $nest: {
      "&:last-of-type": {
        marginRight: 0
      },
      "&:active": {
        opacity: 0.6
      }
    }
  }),
  buttonPrimary: style({
    backgroundColor: colors.primary,
    color: "white"
  })
}

const images = {
  bank: require("../../images/bank.svg"),
  checkmark: require("../../images/checkmark.svg")
}

export class AuthorizePage extends React.PureComponent<Props> {
  public render() {
    const { appName, appLogoUrl, origin, fromLinkPage, disabled } = this.props
    const appInitial = appName[0] || "A"
    // const appLogoUrl =
    //   "https://www.cryptokitties.co/icons/apple-icon-180x180.png"

    return (
      <div className={styles.main}>
        {fromLinkPage && <h5 className={styles.step}>Step 2 of 2</h5>}

        <h3 className={styles.title}>Authorize {appName}</h3>
        <h4 className={styles.origin}>{origin.replace(/^https?:\/\//, "")}</h4>

        <div
          className={styles.logoCircle}
          style={{ backgroundImage: `url("${appLogoUrl}")` }}
        >
          {!appLogoUrl && <span>{appInitial}</span>}
        </div>

        <div className={styles.content}>
          <h4 className={styles.permissionListTitle}>To</h4>

          <ul className={styles.permissionList}>
            <li className={styles.permissionListItem}>
              <img
                className={styles.permissionListIcon}
                src={images.bank}
                alt=""
              />
              <span>See your wallet balance and activity</span>
            </li>
            <li className={styles.permissionListItem}>
              <img
                className={styles.permissionListIcon}
                src={images.checkmark}
                alt=""
              />
              <span>Send you requests for transactions</span>
            </li>
          </ul>

          <p className={styles.permissionInfo}>
            {appName} will not be able to move funds without your permission
          </p>
        </div>

        <div className={styles.buttons}>
          <button
            className={styles.button}
            onClick={this.handleClickDontAllowButton}
            disabled={disabled}
          >
            Deny
          </button>
          <button
            className={classNames(styles.button, styles.buttonPrimary)}
            onClick={this.handleClickAllowButton}
            disabled={disabled}
          >
            Authorize
          </button>
        </div>
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
