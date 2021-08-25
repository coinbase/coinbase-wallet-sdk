// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

const fs = require("fs")
const glob = require("glob")
const sass = require("sass")
const SVGO = require("svgo")

const COPYRIGHT = `// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0`

async function main() {
  // compile SCSS
  const scssFiles = glob.sync(`${__dirname}/src/**/*.scss`)
  for (const filePath of scssFiles) {
    console.log(`Compiling ${filePath}...`)
    const css = sass
      .renderSync({ file: filePath, outputStyle: "compressed" })
      .css.toString("utf8")
    const ts = `${COPYRIGHT}\n\nexport default \`${css}\``
    fs.writeFileSync(filePath.replace(/\.scss$/, "-css.ts"), ts, {
      mode: 0o644
    })
  }

  // compile SVG
  const svgo = new SVGO({ datauri: "base64" })
  const svgFiles = glob.sync(`${__dirname}/src/**/*.svg`)
  for (const filePath of svgFiles) {
    console.log(`Compiling ${filePath}...`)
    const svg = fs.readFileSync(filePath, { encoding: "utf8" })
    const { data } = await svgo.optimize(svg)
    const ts = `${COPYRIGHT}\n\nexport default \`${data}\``
    fs.writeFileSync(filePath.replace(/\.svg$/, "-svg.ts"), ts, {
      mode: 0o644
    })
  }

  console.log("DONE!")
}

main()
