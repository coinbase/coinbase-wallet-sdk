import { style as typestyle } from "typestyle"

const colors = {
  primary: "#5e00ff",
  secondary: "#262626",
  tertiary: "#ed694c",
  cbBlue: "#2b63f5"
}

export const images = {
  browser: require("../../images/browser.svg"),
  key: require("../../images/key.svg"),
  lock: require("../../images/lock.svg"),
  coinbaseWallet: require("../../images/wallets/coinbase-wallet.svg")
}

export const videos = {
  mp4: require("../../videos/video.mp4"),
  webm: require("../../videos/video.webm")
}

export const styles = {
  main: typestyle({
    textAlign: "center",
    fontFamily: "Roboto"
  }),
  section: {
    _: typestyle({
      position: "relative",
      backgroundColor: colors.primary,
      paddingTop: 56,
      paddingBottom: 56,
      paddingLeft: 24,
      paddingRight: 24,
      color: "white"
    }),
    alternate: typestyle({
      backgroundColor: colors.secondary
    }),
    tertiary: typestyle({
      backgroundColor: colors.tertiary
    }),
    centered: typestyle({
      backgroundColor: "white",
      color: "black"
    }),
    container: {
      _: typestyle({
        minWidth: 320,
        maxWidth: 1000,
        marginLeft: "auto",
        marginRight: "auto"
      }),
      left: typestyle({
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
      }),
      right: typestyle({
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between"
      })
    },
    content: {
      _: typestyle({
        textAlign: "left",
        $nest: {
          h2: {
            marginTop: 0,
            marginBottom: 16,
            fontFamily: "Overpass",
            fontWeight: "bold",
            fontSize: 24,
            lineHeight: 1.02
          },
          p: {
            marginTop: 0,
            marginBottom: 32,
            fontSize: 16,
            lineHeight: 1.7,
            opacity: 0.8
          }
        }
      }),
      half: typestyle({
        maxWidth: "50%"
      })
    }
  },
  header: {
    _: typestyle({
      padding: 24
    }),
    content: typestyle({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      $nest: {
        h1: {
          margin: 0,
          fontSize: 24,
          fontFamily: "Overpass",
          $nest: {
            a: {
              color: "white",
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
  hero: {
    video: typestyle({
      maxWidth: "50%"
    }),
    content: typestyle({
      maxWidth: 436,
      $nest: {
        h2: {
          fontSize: 40
        }
      }
    })
  },
  lastCTA: typestyle({
    textAlign: "center",
    $nest: {
      h2: {
        marginBottom: 24
      }
    }
  }),
  roundedButton: {
    _: typestyle({
      display: "inline-block",
      fontFamily: "Overpass",
      fontSize: 16,
      fontWeight: "bold",
      color: "white",
      backgroundColor: colors.primary,
      borderWidth: 4,
      borderStyle: "solid",
      borderColor: "white",
      paddingTop: 15,
      paddingBottom: 15,
      paddingLeft: 24,
      paddingRight: 24,
      borderRadius: 28,
      lineHeight: 1,
      cursor: "pointer",
      transition: "opacity .1s, color .1s, background-color .1s",
      textDecoration: "none",
      $nest: {
        "&:focus": {
          outline: "none"
        },
        "&:active": {
          opacity: 0.6
        },
        "&:hover": {
          backgroundColor: "white",
          color: colors.primary
        }
      }
    }),
    filled: typestyle({
      backgroundColor: "white",
      color: colors.primary,
      $nest: {
        "&:focus": {
          outline: "none"
        },
        "&:active": {
          opacity: 0.6
        },
        "&:hover": {
          backgroundColor: colors.primary,
          color: "white"
        }
      }
    }),
    secondary: typestyle({
      color: "white",
      backgroundColor: colors.secondary,
      $nest: {
        "&:hover": {
          backgroundColor: "white",
          color: colors.secondary
        }
      }
    })
  },
  features: {
    _: typestyle({
      position: "relative",
      paddingTop: 0,
      paddingBottom: 0,
      $nest: {
        ul: {
          position: "relative",
          zIndex: 1,
          listStyle: "none",
          backgroundColor: "white",
          borderRadius: 2,
          color: colors.primary,
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "row",
          $nest: {
            li: {
              flex: 1,
              textAlign: "left",
              padding: 40,
              $nest: {
                img: {
                  width: 32,
                  height: 32
                },
                h3: {
                  fontSize: 18,
                  lineHeight: 1.4,
                  marginTop: 24,
                  marginBottom: 8
                },
                p: {
                  fontSize: 14,
                  lineHeight: 1.7,
                  margin: 0
                }
              }
            }
          }
        }
      }
    }),
    bg: typestyle({
      position: "absolute",
      height: "50%",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.secondary
    })
  },
  snippet: {
    box: typestyle({
      display: "block",
      textAlign: "left",
      background: "white",
      borderRadius: 2,
      $nest: {
        pre: {
          margin: 0,
          paddingTop: 16,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          fontFamily: "Roboto Mono",
          fontSize: 13,
          color: "black",
          $nest: {
            ".k": { color: "#d73a49" },
            ".s": { color: "#032f62" },
            ".f": { color: "#6f42c1" },
            ".n": { color: "#005cc5" }
          }
        }
      }
    }),
    titlebar: typestyle({
      display: "flex",
      flexDirection: "row",
      padding: 8,
      $nest: {
        div: {
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: "#ccc",
          marginRight: 4
        }
      }
    })
  },
  supportedDAppList: typestyle({
    listStyle: "none",
    marginTop: 32,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    padding: 0,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between"
  }),
  supportedDApp: typestyle({
    textAlign: "center",
    $nest: {
      a: {
        fontSize: 16,
        fontWeight: "bold",
        color: "black",
        textDecoration: "none",
        $nest: {
          "&:hover": {
            textDecoration: "underline"
          }
        }
      }
    }
  }),
  supportedDAppLogo: typestyle({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    boxShadow:
      "0px 16px 24px rgba(0, 0, 0, 0.06), 0px 0px 8px rgba(0, 0, 0, 0.04)",
    marginBottom: 24,
    $nest: {
      img: {
        width: 90,
        height: 90
      }
    }
  }),
  inspiringQuote: {
    list: typestyle({
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column"
    }),
    item: {
      _: typestyle({
        width: "60%",
        textAlign: "left",
        marginBottom: 24,
        $nest: {
          "&:last-of-type": {
            marginBottom: 0
          },
          blockquote: {
            fontSize: 40,
            fontWeight: "bold",
            lineHeight: 1.02,
            marginTop: 0,
            marginLeft: 0,
            marginRight: 0,
            marginBottom: 24
          }
        }
      }),
      right: typestyle({
        alignSelf: "flex-end",
        textAlign: "right"
      })
    },
    person: {
      _: typestyle({
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        textAlign: "left",
        fontSize: 16,
        $nest: {
          img: {
            width: 60,
            height: 60,
            borderRadius: 30,
            marginRight: 20
          },
          p: {
            marginTop: 8,
            marginBottom: 8,
            $nest: {
              a: {
                color: "white",
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
      }),
      right: typestyle({
        justifyContent: "flex-end"
      })
    }
  },
  supportedWallets: {
    content: typestyle({
      paddingRight: 48
    }),
    whiteBg: typestyle({
      backgroundColor: "white",
      position: "absolute",
      width: "50%",
      top: 0,
      bottom: 0,
      right: 0
    }),
    wallets: typestyle({
      width: "50%",
      position: "relative",
      backgroundColor: "white",
      color: "black",
      textAlign: "center",
      $nest: {
        h4: {
          position: "relative",
          zIndex: 1,
          fontSize: 24,
          fontFamily: "Overpass",
          marginTop: 24,
          marginBottom: 0,
          $nest: {
            a: {
              color: colors.cbBlue,
              textDecoration: "none",
              $nest: {
                "&:hover": {
                  textDecoration: "underline"
                }
              }
            }
          }
        },
        p: {
          margin: 0
        }
      }
    }),
    walletLogos: typestyle({
      position: "relative",
      display: "flex",
      justifyContent: "center"
    }),
    walletLogo: {
      _: typestyle({
        width: 256,
        height: 256,
        borderRadius: 64,
        backgroundColor: "white",
        boxShadow:
          "0px 16px 24px rgba(0, 0, 0, 0.06), 0px 0px 8px rgba(0, 0, 0, 0.04)"
      }),
      behind: typestyle({
        position: "absolute",
        top: 0,
        transform: "rotate(7deg)",
        zIndex: 2,
        marginLeft: 20,
        marginTop: 8
      }),
      behind2: typestyle({
        position: "absolute",
        top: 0,
        transform: "rotate(22deg)",
        zIndex: 1,
        marginLeft: 48,
        marginTop: 24
      })
    },
    coinbaseWallet: typestyle({
      backgroundImage: `url("${images.coinbaseWallet}")`,
      backgroundSize: "cover",
      marginTop: 0,
      marginBottom: 0,
      marginLeft: "auto",
      marginRight: "auto",
      zIndex: 3
    })
  },
  footer: {
    _: typestyle({
      background: "white",
      color: "black"
    }),
    content: typestyle({
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      textAlign: "left",
      $nest: {
        ul: {
          listStyle: "none",
          margin: 0,
          padding: 0,
          $nest: {
            li: {
              display: "inline",
              marginRight: 16
            }
          }
        },
        h4: { margin: 0 },
        a: {
          fontSize: 16,
          color: "black",
          textDecoration: "none",
          $nest: {
            "&:hover": {
              textDecoration: "underline"
            }
          }
        }
      }
    })
  }
}
