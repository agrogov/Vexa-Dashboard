#!/usr/bin/env bash

VERSION="v0.6.0"
BASE_REPO="docker.ib-ci.com"

docker build --build-arg NEXT_PUBLIC_BASE_PATH=/vexa -t "${BASE_REPO}/vexa/vexa-dashboard:${VERSION}" .
docker push "${BASE_REPO}/vexa/vexa-dashboard:${VERSION}"
