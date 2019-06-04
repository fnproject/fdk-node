FROM node:9-stretch-slim

RUN apt-get update && apt-get upgrade -qy && apt-get clean
# for some reason i see this:
# addgroup: The GID `1000' is already in use.
RUN addgroup --system --gid 1001 --system fn && adduser --system --uid 1001 --ingroup fn fn
