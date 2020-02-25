// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { media, style as typestyle } from "typestyle"

export const styles = {
  main: typestyle({
    textAlign: "center",
    fontFamily: "Roboto"
  }),
  section: {
    _: typestyle({
      position: "relative",
      padding: 24
    }),
    container: {
      _: typestyle({
        minWidth: 320,
        maxWidth: 1000,
        marginLeft: "auto",
        marginRight: "auto"
      })
    }
  },
  header: {
    content: typestyle({
      textAlign: "left",
      $nest: {
        h1: {
          margin: 0,
          fontSize: 24,
          fontFamily: "Overpass",
          $nest: {
            a: {
              color: "black",
              textDecoration: "none",
              $nest: {
                "&:hover": {
                  textDecoration: "underline"
                }
              }
            }
          }
        }
      }
    })
  },
  box: typestyle({
    backgroundColor: "#fff",
    borderRadius: 8,
    display: "flex",
    justifyContent: "center"
  }),
  content: typestyle({
    maxWidth: 626,
    $nest: {
      h3: {
        fontSize: 24,
        fontFamily: "Overpass",
        marginTop: 16,
        marginBottom: 32
      },
      p: {
        fontSize: 16,
        color: "#333",
        marginTop: 0,
        marginBottom: 32
      },
      small: {
        display: "block",
        fontSize: 12,
        color: "#999",
        marginBottom: 16
      }
    }
  }),
  wallets: {
    _: typestyle({
      listStyle: "none",
      margin: 0,
      marginBottom: 16,
      padding: 0
    }),
    row: typestyle(
      {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: "#ddd",
        paddingTop: 16,
        paddingBottom: 16
      },
      media({ maxWidth: 600 }, { flexDirection: "column" })
    ),
    logoAndName: typestyle(
      {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        flexGrow: 1,
        $nest: {
          h4: {
            flexGrow: 1,
            textAlign: "left",
            fontFamily: "Overpass"
          },
          img: {
            width: 60,
            height: 60,
            borderRadius: 20,
            flexShrink: 0,
            marginRight: 16
          }
        }
      },
      media({ maxWidth: 600 }, { marginBottom: 16 })
    ),
    links: typestyle({
      flexShrink: 0,
      $nest: {
        a: {
          marginLeft: 16
        }
      }
    })
  }
}
