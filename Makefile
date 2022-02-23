IMG ?= create-hc-resources:latest

docker-build:
# Base image for go is pulled from registry.redhat.io
	docker login -u="${RH_REGISTRY_USER}" -p="${RH_REGISTRY_TOKEN}" registry.redhat.io
	docker build --tag ${IMG} .

docker-run:
	docker run --env-file env.list create-hc-resources