# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2 AS build
WORKDIR /build

# Copy package files first to cache dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Then copy source code and build
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1.2-slim AS runtime
WORKDIR /usr/src/app

# Copy only production files and node_modules
COPY --from=build --chown=bun:bun /build/package.json /build/bun.lock ./
COPY --from=build --chown=bun:bun /build/node_modules ./node_modules
COPY --from=build --chown=bun:bun /build/build ./build

USER bun
EXPOSE 3000/tcp
EXPOSE 3000/udp
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "start" ]
