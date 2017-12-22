FROM alpine
MAINTAINER Simon Lacroix <simon@test.io>

RUN apk --update add \
  bash \
  curl \
  nodejs \
  tmux \
  vim \
  wget

WORKDIR /app

ADD package.json ./
ADD package-lock.json ./
RUN npm install

ADD . .

EXPOSE 3000

CMD ["npm", "start"]
