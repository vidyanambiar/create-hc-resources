# Copyright Red Hat

############################
# STEP 1 build executable binary
############################

# Set the base image as the official Go image that already has all the tools and packages to compile and run a Go application
FROM registry.ci.openshift.org/open-cluster-management/builder:go1.17-linux AS builder

# Set the current working directory inside the container
WORKDIR /app

COPY . .

# Fetch dependencies.
# Using go get requires root.
USER root
RUN go get -d -v

# Compile the application
RUN go build -o /create-hc-resources

############################
# STEP 2 build a small image
############################

FROM registry.redhat.io/ubi8-minimal:latest

COPY --from=builder /create-hc-resources /usr/bin
USER 1001

# Execute the aplication
CMD [ "create-hc-resources" ]
