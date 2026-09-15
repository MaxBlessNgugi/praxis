# The Praxis API, as a container.
#
# Railway and Render build this without being told to; it is also the deployment path for Fly, a
# parish's own machine, or anything else that runs a container. `railway.json` remains the instruction
# for Railway's own builder, and the two agree on the commands deliberately — whichever a host picks,
# the process starts the same way.
#
# One stage, on purpose. The tidy-looking alternative — compile in a build stage and copy only
# production dependencies into the runtime image — does not survive first contact with Prisma: the
# boot sequence runs `prisma migrate deploy`, and `prisma` is a **dev** dependency, so a runtime image
# built with `--omit=dev` has no migration command in it. Keeping one install means `migrate deploy`
# and `prisma generate` both work at boot, which is what the railway.json start command already
# assumes. The cost is a larger image; the alternative is a container that cannot apply its own
# migrations.

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# `openssl` is what the Prisma engine links against. The slim base image does not ship it, and the
# failure without it is a startup error that reads like a corrupt client rather than a missing library.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Dependencies before source, so editing a file does not reinstall the world.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Run as the image's unprivileged user rather than as root: a service that answers HTTP with a parish's
# records has no reason to be able to write to its own filesystem as the superuser.
USER node

# The port the console expects, and the one the API defaults to.
EXPOSE 4000

# Liveness for whatever orchestrates this: the same `/health` an uptime monitor calls, which
# round-trips to the database and answers 503 when it cannot reach it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# `migrate deploy` first, so a container started against an out-of-date database brings it up to date
# rather than serving requests a migration has not prepared it for. It applies only migrations that
# have not run and does nothing on a current database, which is why it is safe on every boot. It needs
# DIRECT_URL — the unpooled connection — because DDL cannot go through a PgBouncer in transaction mode;
# see docs/cloud-deploy.md.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
