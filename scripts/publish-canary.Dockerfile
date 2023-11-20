FROM 652969937640.dkr.ecr.us-east-1.amazonaws.com/containers/node:v18

RUN apt-get update \
  && apt-get install -y jq

COPY . ./sdk

WORKDIR /sdk

RUN yarn install

RUN yarn release -- canary

RUN npm pack -w @coinbase/wallet-sdk 

RUN mv /sdk /shared

WORKDIR /shared
