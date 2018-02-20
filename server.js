const logger = require('./logger');
const MassageBooking = require('./services/massage_booking');
const { WebClient } = require('@slack/client');


const massageBooking = new MassageBooking(
  new WebClient(process.env.SLACK_API_TOKEN),
  { host: process.env.REDIS_HOST, prefix: process.env.NODE_ENV },
  parseInt(process.env.BOOKING_DURATION, 10),
);


// To send notifications to users when their booking start
setInterval(() => {
  massageBooking.notifyUserOfBooking();
}, 1000);


const app = require('./app');

app.listen(3000, () => {
  logger.info('Web server is listening', { port: 3000 });
});
