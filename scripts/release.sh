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

packageName="wallet-sdk"
for arg in "$@"; do
  case $arg in
    --package=*)
      packageName="${arg#*=}"
      shift
      ;;
    --canary)
      canaryRelease=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

if [ $branch == $mainBranch ]; then
  echo -e "${PURPLE} Checking all branches are up-to-date..."
  echo -e "================================================="
  echo -e " git fetch --all"
  git fetch --all
  echo -e " git pull"
  git pull
  echo -e "-------------------------------------------------"
  echo -e "${TEAL} Build production and publish..."
  echo "================================================="
  echo -e "rm -rf ./node_modules"
  rm -rf ./node_modules
  rm -rf ./packages/wallet-sdk/node_modules
  echo -e "rm -rf ./dist"
  rm -rf ./packages/wallet-sdk/dist
  echo -e "yarn install"
  yarn install
  echo -e "yarn workspace @coinbase/wallet-sdk build"
  yarn workspace @coinbase/wallet-sdk build
  echo -e "cd ./packages/wallet-sdk"
  cd ./packages/wallet-sdk
  echo "================================================="
  echo -e " ${GREEN} run 'npm publish'"
  echo "================================================="
elif [ "$canaryRelease" == true ]; then
  echo -e "Preparing canary release..."
  echo "Updating package: $packageName"
  cd "./packages/$packageName" || exit
  commitCount=$(git rev-list --count HEAD)
  newVersion=$(jq -r '.version' package.json)"-canary.$commitCount"
  jq ".version = \"$newVersion\"" package.json > temp.json && \
  mv temp.json package.json
  echo "Canary version updated to $newVersion"
  if [ "$packageName" == "scw-sdk-host" ]; then
    echo "Removing dependencies from package.json"
    jq 'del(.dependencies)' package.json > temp.json && \
    mv temp.json package.json
  fi
  yarn install
  yarn build
else
  echo -e "${RED}⚠️  Need to publish from ${mainBranch} branch"
  echo -e "${REDBOLD}Checking out ${mainBranch}... "
  git checkout master
  echo -e "${RED}Run again"
fi
