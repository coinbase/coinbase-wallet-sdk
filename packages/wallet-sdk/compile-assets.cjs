/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

const fs = require('fs');
const glob = require('glob');
const sass = require('sass');

async function main() {
  // compile SCSS
  const scssFiles = glob.sync(`${__dirname}/src/**/*.scss`);
  for (const filePath of scssFiles) {
    console.info(`Compiling ${filePath}...`);
    const css = sass.renderSync({ file: filePath, outputStyle: 'compressed' }).css.toString('utf8');
    const ts = `export default (() => \`${css}\`)();`;
    fs.writeFileSync(filePath.replace(/\.scss$/, '-css.ts'), ts, {
      mode: 0o644,
    });
  }
  console.info('DONE!');
}

main();
