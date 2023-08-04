# Y.A.T.A. - Yet Another Testing dApp

![Screenshot of dApp](/assets/screenshot-yata.png)

## Getting Started

This project uses Next.js, TypeScript, Playwright and Chakra UI.

To get started:

1. Clone the repo


2. Install dependencies

```bash
yarn install
```

3. Run the development server:

```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

The main page is in `app/page.tsx`.

Components are in `components/*`.

## Useful Commands

- `yarn dev` - start the dev server
- `yarn build` - create a production build
- `yarn lint` - run ESLint
- `yarn format` - run Prettier
- `yarn test` - run e2e tests

## Generate a new RPC method component

To add a new RPC method, run:

```bash
yarn plop
```

and follow the prompts. This will generate a new component in `components/rpc-methods` and add it to the `app/page.tsx` file.

![Screenshot of terminal running plop](/assets/screenshot-plop.png)

![Screenshot of new file](/assets/screenshot-plop-localhost.png)

## Deployed on Netlify

https://yet-another-testing-dapp.netlify.app/

## TODO:

- [ ] Move e2e testing to https://github.com/coinbase/coinbase-wallet-sdk
- [ ] Add documentation for deployment
- [ ] Add template for adding a new library

## Future ideas:
- [ ] Mobile view?
- [ ] List of chain id's

## Learn More


To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

For Chakra UI:

- [Chakra UI Docs](https://chakra-ui.com/docs/getting-started)
You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

----

Built with 💙 by #wallet-squad-build.