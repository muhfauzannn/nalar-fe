# syntax=docker/dockerfile:1

# --- Full deps (for build) ---
FROM node:24-alpine AS dev-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Production deps only (for runtime) ---
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Build the SSR bundle ---
# VITE_* values are inlined at build time, so they are baked into the image.
FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ARG VITE_APP_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runtime (react-router-serve) ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["npm", "run", "start"]
