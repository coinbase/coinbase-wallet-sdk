PACKAGE_JSON="./packages/scw-sdk-host/package.json"
jq '.dependencies = .peerDependencies' "$PACKAGE_JSON" > temp.json
if [ $? -eq 0 ]; then
    mv temp.json "$PACKAGE_JSON"
    echo "peerDependencies have been copied to dependencies"
    cat "$PACKAGE_JSON"
else
    echo "Failed to update $PACKAGE_JSON"
    rm temp.json
fi

yarn config set enableImmutableInstalls false # i think i know what i am doing
yarn install
