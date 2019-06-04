#!/usr/bin/env bash

user="fnproject"
image="node"
runtime9="9"
runtime10="10"
runtime11="11"

docker push ${user}/${image}:${runtime9}
docker push ${user}/${image}:${runtime9}-dev

docker push ${user}/${image}:${runtime10}
docker push ${user}/${image}:${runtime10}-dev

docker push ${user}/${image}:${runtime11}
docker push ${user}/${image}:${runtime11}-dev
