FROM alpine
MAINTAINER Simon Lacroix <simon@miaou.be>

RUN apk --update add \
  bash \
  curl \
  nodejs \
  tmux \
  tzdata \
  vim \
  wget

WORKDIR /app

ADD package.json ./
ADD package-lock.json ./
RUN npm install

ADD . .

EXPOSE 3000

CMD ["npm", "start"]
