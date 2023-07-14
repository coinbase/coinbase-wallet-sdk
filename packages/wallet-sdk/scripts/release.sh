#! /bin/bash

# COLORS
REDBOLD='\033[1;31m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
TEAL='\033[0;36m'
GREEN='\033[1;32m'

gitMessage=$(git log --oneline -n 1)
mainBranch="master"
branch=$(git rev-parse --abbrev-ref HEAD)

if [ $branch == $mainBranch ]; then
  echo -e "${PURPLE}Checking all branches are up-to-date..."
  echo -e "================================================="
  echo -e " git fetch --all"
  git fetch --all
  echo -e " git pull"
  git pull
  echo -e "-------------------------------------------------"
  echo -e "${TEAL}Build production and publish..."
  echo "================================================="
  echo -e "rm -rf ./node_modules"
  rm -rf ./node_modules
  echo -e "yarn install"
  yarn install
  echo -e "yarn workspace @coinbase/wallet-sdk build:prod"
  yarn workspace @coinbase/wallet-sdk build:prod
  echo "================================================="
  echo -e " ${GREEN}cd build/npm and run 'npm publish'"
  echo "================================================="
else
  echo -e "${RED}⚠️  Need to publish from ${mainBranch} branch"
  echo -e "${REDBOLD}Checking out ${mainBranch}... "
  git checkout master
  echo -e "${RED}Run again"
fi

# TODO: Add Slack notification?
# - Add release notes generation?
# - Add version tag as argument?
# - Add prompt for  npm login?