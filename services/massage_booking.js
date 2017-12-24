const DateRange = require('../models/date_range');
const request = require('request');
const Reservation = require('../models/reservation');
const User = require('../models/user');

function extractTimeFromString(string) {
  const now = new Date(Date.now());
  const [hours, minutes] = string.split(':').map(x => parseInt(x, 10));
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

function sendMessageToSlackResponseUrl(responseUrl, jsonMessage, callback) {
  const postOptions = {
    uri: responseUrl,
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    json: jsonMessage,
  };

  request(postOptions, callback);
}

class MassageBooking {
  constructor(slackWebClient) {
    this.slackWebClient = slackWebClient;
    this.reservations = [];
  }

  actionHandler(payload, callback) {
    const selectedTime = extractTimeFromString(payload.actions[0].type === 'select' ? payload.actions[0].selected_options[0].value : payload.actions[0].value);

    const user = new User(payload.user.id, payload.user.name);
    const dateRange = new DateRange(selectedTime, selectedTime);
    this.reservations.push(new Reservation(user, dateRange));


    const message = {
      attachments: [
        {
          text: `${payload.user.name} clicked: ${payload.actions[0].name}`,
        },
      ],
      replace_original: true,
    };

    sendMessageToSlackResponseUrl(payload.response_url, message, callback);


    // web.chat.update(payload.channel.id, 'Test', payload.message_ts, (err, res) => {
    //   if (err) {
    //     console.log('Error:', err);
    //   } else {
    //     console.log('Message sent: ', res);
    //   }
    // });
  }

  bookMassage(payload, callback) {
    const nextAvailability = this.nextAvailability();
    const attachments = [
      {
        text: `There is one spot available at ${nextAvailability}, do you want to reserve it?`,
        callback_id: 'book-massage',
        attachment_type: 'default',
        actions: [
          {
            name: 'reserve',
            text: `Yes, reserve ${nextAvailability}`,
            type: 'button',
            value: nextAvailability,
          },
          {
            name: 'reserve',
            text: 'Pick a another time...',
            type: 'select',
            options: [
              { text: '14:30', value: '14:30' },
              { text: '15:45', value: '15:45' },
            ],
          },
        ],
      },
    ];

    sendMessageToSlackResponseUrl(payload.response_url, { attachments }, callback);


    // web.chat.postMessage(payload.channel_id, 'Test', { attachments }, (err, res) => {
    //   if (err) {
    //     console.log('Error:', err);
    //   } else {
    //     console.log('Message sent: ', res);
    //   }
    // });
  }

  nextAvailability() {
    const currentTimeInMs = Date.now();
    const now = new Date(currentTimeInMs);
    return `${now.getHours()}:${now.getMinutes()}`;
  }
}

module.exports = MassageBooking;
