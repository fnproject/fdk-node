#!/usr/bin/env bash
set -ex

docker run --rm -it -v $PWD:/mypkg -w /mypkg node:9-alpine npm install
docker run --rm -it -v $PWD:/mypkg -w /mypkg node:9-alpine npm run test
