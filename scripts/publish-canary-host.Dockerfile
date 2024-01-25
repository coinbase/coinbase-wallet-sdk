FROM 652969937640.dkr.ecr.us-east-1.amazonaws.com/containers/node:v18

RUN apt-get update \
  && apt-get install -y jq

COPY . ./sdk

WORKDIR /sdk

RUN yarn install

RUN yarn release --canary --package=scw-sdk-host

RUN npm pack -w @cbhq/scw-sdk-host

RUN mv /sdk /shared

WORKDIR /shared
