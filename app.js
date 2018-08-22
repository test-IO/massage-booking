const bodyParser = require('body-parser');
const express = require('express');
const logger = require('./logger');
const MassageBooking = require('./services/massage_booking');
const { WebClient } = require('@slack/client');


const massageBooking = new MassageBooking(
  new WebClient(process.env.SLACK_API_TOKEN),
  { host: process.env.REDIS_HOST, prefix: process.env.NODE_ENV },
  parseInt(process.env.BOOKING_DURATION, 10),
);


const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/web', (req, res) => res.sendfile(`${__dirname}/web/index.html`));
app.get('/web/script.js', (req, res) => res.sendfile(`${__dirname}/web/script.js`));
app.get('/web/style.css', (req, res) => res.sendfile(`${__dirname}/web/style.css`));
app.get('/web/massage.gif', (req, res) => res.sendfile(`${__dirname}/web/massage.gif`));

app.post('/slack/slash-commands/massage_booking', urlencodedParser, (req, res) => {
  res.status(200).end();
  const payload = req.body;

  if (payload.token !== process.env.VERIFICATION_TOKEN) {
    res.status(403).end('Access forbidden');
    return;
  }

  massageBooking.bookMassage(payload, (error, response, body) => {
    if (error) {
      logger.error('Error', { method: 'bookMassage', error });
    } else {
      logger.info('Success', { method: 'bookMassage', body });
    }
  });
});

app.post('/slack/actions', urlencodedParser, (req, res) => {
  res.status(200).end();
  const payload = JSON.parse(req.body.payload);

  if (payload.token !== process.env.VERIFICATION_TOKEN) {
    res.status(403).end('Access forbidden');
    return;
  }

  massageBooking.actionHandler(payload, (error, response, body) => {
    if (error) {
      logger.error('Error', { method: 'actionHandler', error });
    } else {
      logger.info('Success', { method: 'actionHandler', body });
    }
  });
});

app.get('/bookings', (req, res) => {
  res.status(200);
  massageBooking.bookingRepository.all().then((bookings) => {
    const now = new Date();
    res.json({ bookings: bookings.filter(booking => booking.dateRange.end > now).sort((a, b) => a.dateRange.start - b.dateRange.start) });
  });
});


module.exports = app;
