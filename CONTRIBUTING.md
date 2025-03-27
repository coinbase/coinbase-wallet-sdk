# Contributing

## Table of Contents
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Setting up your development environment](#setting-up-your-development-environment)
  - [Installing dependencies](#installing-dependencies)
  - [Navigating the codebase](#navigating-the-codebase)
  - [Linting and formatting](#linting-and-formatting)
  - [Signing Commits](#signing-commits)
- [Coding Conventions](#coding-conventions)
  - [Git Commit Messages](#git-commit-messages)

## How to Contribute

🎉 First off, thank you for considering contributing to the Coinbase Wallet SDK! 🎉

The following is a set of guidelines for contributing to the Coinbase Wallet SDK. These are just guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

### Reporting Bugs

1. **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/coinbase/coinbase-wallet-sdk/issues).

2. If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/coinbase/coinbase-wallet-sdk/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

1. **Check the [Issues](https://github.com/coinbase/coinbase-wallet-sdk/issues)** to see if there's someone who has already suggested the same enhancement.

2. If it doesn't exist, [create a new issue](https://github.com/coinbase/coinbase-wallet-sdk/issues/new). Provide a clear and detailed explanation of the feature you want and why it's important to add.

### Pull Requests

1. **Fork the repository** and create your branch from `master`.

2. **Make your changes**: Apply your changes, following the coding conventions described below.

3. **Commit your changes**: Commit your changes using a descriptive commit message.

4. **Open a Pull Request**: Describe what you did in the pull request description. Mention the issue number if your pull request is related to an existing issue.

5. **Include Screenshots**: If your pull request includes any visual changes to the project, please include before and after screenshots in your pull request description to help us better understand the changes.

6. **Wait for review**: Once your pull request is opened, it will be reviewed as soon as possible. Changes may be requested, and your responsiveness is appreciated.

## Setting up your development environment

### Installing dependencies

First, ensure that the following are installed globally on your machine:

- [Node.js 20.11+](https://nodejs.org/en/download/releases)
- [Yarn v3](https://yarnpkg.com/getting-started/install)

Then, from the root folder run:

- `yarn install` to install dependencies
- `yarn build` to build the package
- `yarn dev` to start the example app and build the package with hot reloading
- `yarn test` to ensure that the test suite runs correctly

### Navigating the codebase

The SDK is built using yarn workspaces. 

- `packages/wallet-sdk` - The main package that exports the SDK
- `examples/test-app` - An example React app that is used to test the SDK in a real browser environment

Use `yarn dev` to start the example app and build the package with hot reloading.

### Linting and formatting

This project uses [Biome](https://github.com/biomejs/biome) for linting and formatting. See the [Biome docs](https://biomejs.dev/guides/editors/first-party-extensions/) for more information on how to configure your editor to use Biome.

### Signing Commits

All commits need to be signed with a GPG key. This adds a second factor of authentication that proves that it came from
you, and not someone who managed to compromise your GitHub account. You can enable signing by following the guide [here](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification#gpg-commit-signature-verification).

## Coding Conventions

### Git Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for our commit messages. This helps us generate changelogs and follow a standard format.