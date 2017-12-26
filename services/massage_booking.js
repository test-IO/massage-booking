const DateRange = require('../models/date_range');
const request = require('request');
const Reservation = require('../models/reservation');
const User = require('../models/user');

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (60000 * minutes));
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

function timeToString(date) {
  if (date.getMinutes() < 10) {
    return `${date.getHours()}:0${date.getMinutes()}`;
  }
  return `${date.getHours()}:${date.getMinutes()}`;
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

    const dateRange = new DateRange(startTime, endTime);
    if (this.dateRangeAvailable(payload.user.id, dateRange)) {
      this.reservations = this.reservations.filter(reservation => reservation.user.id !== payload.user.id);

      const user = new User(payload.user.id, payload.user.name);
      this.reservations.push(new Reservation(user, dateRange));

      const message = {
        attachments: [
          {
            text: `Thanks for your booking at ${timeToString(startTime)}`,
          },
        ],
        replace_original: true,
      };

      sendMessageToSlackResponseUrl(payload.response_url, message, callback);
    } else {
      const message = {
        attachments: [
          {
            text: 'Sorry but this time is not available anymore',
          },
        ],
        replace_original: true,
      };

      sendMessageToSlackResponseUrl(payload.response_url, message, callback);
    }
  }

  bookMassage(payload, callback) {
    const nextAvailabilities = this.findAvailabilities(payload.user_id, 25);
    const nextAvailabilityString = timeToString(nextAvailabilities[0]);

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
            options: nextAvailabilities.map(date => timeToString(date))
              .map(value => ({ test: value, value })),
          },
        ],
      },
    ];

    sendMessageToSlackResponseUrl(payload.response_url, { attachments }, callback);
  }

  dateRangeAvailable(userId, dateRange) {
    const intersectedReservation = this.reservations.find(reservation =>
      reservation.user.id !== userId &&
      ((dateRange.start >= reservation.dateRange.start &&
              dateRange.start < reservation.dateRange.end) ||
            (dateRange.end > reservation.dateRange.start &&
              dateRange.end <= reservation.dateRange.end)));
    return typeof intersectedReservation === 'undefined';
  }

  findAvailabilities(userId, maxAvalaibilities = 10, minutesPerStep = 5) {
    const availabilities = [];
    let iterator = new Date();
    const maxAvalaibilityDate = new Date(
      iterator.getFullYear(), iterator.getMonth(), iterator.getDate(),
      23, 59, 999,
    );

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
      const dateRange = new DateRange(iterator, addMinutes(iterator, this.reservationDuration));
      if (this.dateRangeAvailable(userId, dateRange)) {
        availabilities.push(new Date(iterator));
      }
      iterator = addMinutes(iterator, minutesPerStep);
    }

    return availabilities;
  }
}

module.exports = MassageBooking;
