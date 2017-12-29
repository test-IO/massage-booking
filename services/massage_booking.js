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
    const selectedDate = timeFromString(payload.actions[0].type === 'select' ? payload.actions[0].selected_options[0].value : payload.actions[0].value);
    const dateRange = new DateRange(selectedDate, addMinutes(selectedDate, this.reservationDuration));

    if (this.dateRangeAvailable(payload.user.id, dateRange)) {
      const user = new User(payload.user.id, payload.user.name);
      const previousReservation = this.findReservationForUserId(user.id);

      this.removeReservationsForUserId(user.id);
      this.addReservation(new Reservation(user, dateRange));

      const message = {
        attachments: [],
        replace_original: true,
      };
      if (typeof previousReservation === 'undefined') {
        message.attachments.push({
          text: `Thanks for your booking at ${timeToString(dateRange.start)} -> ${timeToString(dateRange.end)}`,
        });
      } else {
        message.attachments.push({
          text: `Your booking as been successfully updated to ${timeToString(dateRange.start)} -> ${timeToString(dateRange.end)}`,
        });
      }

      sendMessageToSlackResponseUrl(payload.response_url, message, callback);
    } else {
      const message = {
        attachments: [
          {
            text: 'Sorry but this time is not available anymore.',
          },
        ],
        replace_original: true,
      };

      sendMessageToSlackResponseUrl(payload.response_url, message, callback);
    }
  }

  addReservation(reservation) {
    this.reservations.push(reservation);
  }

  bookMassage(payload, callback) {
    if (payload.text === 'list') {
      const now = new Date();
      const attachments = this.reservations.filter(reservation => reservation.dateRange.end > now).sort((a, b) => a.dateRange.start - b.dateRange.start).map((reservation) => {
        const attachment = {
          text: `${timeToString(reservation.dateRange.start)} -> ${timeToString(reservation.dateRange.end)} ${reservation.user.name}`,
        };
        if (reservation.user.id === payload.user_id) {
          attachment.color = '#36a64f';
        }
        return attachment;
      });

      if (attachments.length === 0) {
        attachments.push({ text: 'There is no booking yet, book a massage!', color: '#36a64f' });
      }

      sendMessageToSlackResponseUrl(payload.response_url, { attachments }, callback);
    } else {
      const nextAvailabilities = this.findAvailabilities(payload.user_id, 25);
      const nextAvailabilityString = timeToString(nextAvailabilities[0]);
      const previousReservation = this.findReservationForUserId(payload.user_id);

      const attachments = [
        {
          text: `There is one spot available at ${nextAvailabilityString}, do you want to reserve it?`,
          color: '#36a64f',
          callback_id: 'book-massage',
          attachment_type: 'default',
          actions: [
            {
              name: 'reserve',
              text: `Yes, reserve ${timeToString(nextAvailabilities[0])} -> ${timeToString(addMinutes(nextAvailabilities[0], this.reservationDuration))}`,
              type: 'button',
              value: nextAvailabilityString,
            },
            {
              name: 'reserve',
              text: 'Pick a another time...',
              type: 'select',
              options: nextAvailabilities.map(date => ({
                text: `${timeToString(date)} -> ${timeToString(addMinutes(date, this.reservationDuration))}`,
                value: timeToString(date),
              })),
            },
          ],
        },
      ];

      if (typeof previousReservation !== 'undefined') {
        attachments.push({
          text: `Note: You already have a reservation for ${timeToString(previousReservation.dateRange.start)} -> ${timeToString(previousReservation.dateRange.end)}.\nMaking a new reservation will cancel the previous ones.`,
          color: '#ffcc00',
        });
      }

      sendMessageToSlackResponseUrl(payload.response_url, { attachments }, callback);
    }
  }

  dateRangeAvailable(userId, dateRange) {
    const intersectedReservation = this.reservations.find(reservation => reservation.user.id !== userId && reservation.dateRange.isIntersecting(dateRange));
    return typeof intersectedReservation === 'undefined';
  }

  findAvailabilities(userId, maxAvalaibilities = 10, minutesPerStep = 5) {
    const availabilities = [];
    let iterator = new Date();
    const maxAvalaibilityDate = new Date(iterator.getFullYear(), iterator.getMonth(), iterator.getDate(), 23, 59, 999);

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

  findReservationForUserId(userId) {
    const now = new Date();
    return this.reservations.filter(reservation => reservation.dateRange.end > now)
      .find(reservation => reservation.user.id === userId);
  }

  removeReservationsForUserId(userId) {
    const now = new Date();
    this.reservations = this.reservations.filter(reservation => reservation.dateRange.end > now && reservation.user.id !== userId);
  }
}

module.exports = MassageBooking;
