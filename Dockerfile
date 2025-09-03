# Use official Node.js image as a base
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first (for caching dependencies)
COPY package.json package-lock.json ./ 

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

EXPOSE 4050

# Start the Next.js application
CMD ["npm", "run", "start", "--", "-p", "4050"]
