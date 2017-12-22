const bodyParser = require('body-parser');
const express = require('express');
const logger = require('./logger');
const MacysBooking = require('./macys_booking');
const { WebClient } = require('@slack/client');

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

const slackWebClient = new WebClient(process.env.SLACK_API_TOKEN);
const macysBooking = new MacysBooking(slackWebClient);

app.get('/', (req, res) => res.send('Hello World!'));

app.post('/slack/slash-commands/book-massage', urlencodedParser, (req, res) => {
  res.status(200).end();
  const payload = req.body;

  if (payload.token !== process.env.VERIFICATION_TOKEN) {
    res.status(403).end('Access forbidden');
  } else {
    macysBooking.bookMassage(payload);
  }
});

app.post('/slack/actions', urlencodedParser, (req, res) => {
  res.status(200).end();
  const payload = JSON.parse(req.body.payload);

  if (payload.token !== process.env.VERIFICATION_TOKEN) {
    res.status(403).end('Access forbidden');
  } else {
    macysBooking.actionHandler(payload);
  }
});

app.listen(3000, () => {
  logger.info('Web server is listening', { port: 3000 });
});
