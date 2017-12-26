const DateRange = require('../models/date_range');
const request = require('request');
const Reservation = require('../models/reservation');
const User = require('../models/user');

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (60000 * minutes));
}

function findAvailabilities(
  reservations, maxAvalaibilities = 10,
  minutesPerStep = 5, searchWindowInMinutes = 1440,
) {
  const availabilities = [];
  let iterator = new Date();
  const maxAvalaibilityDate = addMinutes(iterator, searchWindowInMinutes);

  if (iterator.getMinutes() % 5 <= 3) {
    iterator.setMinutes(iterator.getMinutes() - (iterator.getMinutes() % 5));
  } else {
    const newMinutes = iterator.getMinutes() + (5 - (iterator.getMinutes() % 5));
    if (newMinutes === 60) {
      iterator.setHours(iterator.getHours() + 1);
      iterator.setMinutes(0);
    } else {
      iterator.setMinutes(newMinutes);
    }
  }
  iterator.setSeconds(0);
  iterator.setMilliseconds(0);

  while (availabilities.length < maxAvalaibilities && iterator < maxAvalaibilityDate) {
    const [start, end] = [iterator, addMinutes(iterator, 20)];
    const intersectedReservation = reservations.find(reservation => (
      start >= reservation.dateRange.start && start < reservation.dateRange.end) ||
     (end > reservation.dateRange.start && end <= reservation.dateRange.end));

    if (typeof intersectedReservation === 'undefined') {
      availabilities.push(new Date(iterator));
    }

    iterator = addMinutes(iterator, minutesPerStep);
  }

  return availabilities;
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

function timeFromString(string) {
  const now = new Date();
  const [hours, minutes] = string.split(':').map(x => parseInt(x, 10));
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}


class MassageBooking {
  constructor(slackWebClient, reservationDuration = 20) {
    this.reservationDuration = reservationDuration;
    this.reservations = [];
    this.slackWebClient = slackWebClient;
  }

  actionHandler(payload, callback) {
    const startTime = timeFromString(payload.actions[0].type === 'select' ? payload.actions[0].selected_options[0].value : payload.actions[0].value);
    const endTime = addMinutes(startTime, this.reservationDuration);

    const user = new User(payload.user.id, payload.user.name);
    const dateRange = new DateRange(startTime, endTime);
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
  }

  bookMassage(payload, callback) {
    const nextAvailabilities = findAvailabilities(this.reservations);
    const nextAvailabilityString = nextAvailabilities[0].getMinutes() < 10 ? `${nextAvailabilities[0].getHours()}:0${nextAvailabilities[0].getMinutes()}` : `${nextAvailabilities[0].getHours()}:${nextAvailabilities[0].getMinutes()}`;

    const attachments = [
      {
        text: `There is one spot available at ${nextAvailabilityString}, do you want to reserve it?`,
        callback_id: 'book-massage',
        attachment_type: 'default',
        actions: [
          {
            name: 'reserve',
            text: `Yes, reserve ${nextAvailabilityString}`,
            type: 'button',
            value: nextAvailabilityString,
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
  }
}

module.exports = MassageBooking;
