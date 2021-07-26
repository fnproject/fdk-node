Image on Docker Hub: https://hub.docker.com/r/fnproject/node

## Building Node images

```sh
pushd build-stage/11; docker build -t fnproject/node:11-dev .; popd
pushd runtime/11; docker build -t fnproject/node:11 .; popd
```

```sh
pushd build-stage/14; docker build -t fnproject/node:14-dev .; popd
pushd runtime/14; docker build -t fnproject/node:14 .; popd
```

Then push:

```sh
docker push fnproject/node:11-dev
docker push fnproject/node:11
```

```sh
docker push fnproject/node:14-dev
docker push fnproject/node:14
```