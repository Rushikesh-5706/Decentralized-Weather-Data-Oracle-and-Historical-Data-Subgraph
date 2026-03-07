FROM node:18-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy everything
COPY . .

# Compile smart contracts
RUN npx hardhat compile
RUN mkdir -p /app/frontend/src/contracts && cp /app/artifacts/contracts/WeatherOracle.sol/WeatherOracle.json /app/frontend/src/contracts/

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN CI=false DISABLE_ESLINT_PLUGIN=true npm run build

# Base image for serving
FROM nginx:alpine
COPY --from=builder /app/frontend/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
