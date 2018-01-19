# Massage Booking

## Development tools

```bash
# Install dependencies
npm install

# Test the app
npm test

# Run the linter
npm run lint

# Run the linter with autofix
npm run lint -- --fix

# Make your machine accessible from the internet (More on https://ngrok.com/)
./ngrok http 3000
```

## Docker

```bash
# Build docker images
docker-compose build

# Run development docker
docker-compose run --service-ports web

# Reproduce ci tests
docker-compose -f docker-compose.test.yml build && docker-compose -f docker-compose.test.yml run sut

# Deploying using docker swarm
docker stack deploy -c docker-compose.stack.yml massage-booking
```
