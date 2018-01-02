const Booking = require('../models/booking');
const BookingRepository = require('../services/booking_repository');
const DateRange = require('../models/date_range');
const request = require('request');
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
  constructor(slackWebClient, bookingDuration = 20) {
    this.bookingDuration = bookingDuration;
    this.bookingRepository = new BookingRepository();
    this.slackWebClient = slackWebClient;
  }

  actionHandler(payload, callback) {
    const selectedDate = timeFromString(payload.actions[0].type === 'select' ? payload.actions[0].selected_options[0].value : payload.actions[0].value);
    const dateRange = new DateRange(selectedDate, addMinutes(selectedDate, this.bookingDuration));

    this.bookingRepository.all().catch(callback).then((bookings) => {
      const bookingaaaa = bookings.find(b => b.user.id !== payload.user.id && b.dateRange.isIntersecting(dateRange));
      if (typeof bookingaaaa === 'undefined') {
        this.findUserById(payload.user.id, (error, user) => {
          if (error) {
            callback(error);
            return;
          }

          const now = new Date();
          const previousReservation = bookings.filter(reservation => reservation.dateRange.end > now)
            .find(reservation => reservation.user.id === user.id);

          bookings.forEach((booking) => {
            if (booking.user.id === user.id) {
              this.bookingRepository.remove(booking).catch(callback);
            }
          });

          this.bookingRepository.add(new Booking(user, dateRange)).catch(callback).then(() => {
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
          });
        });
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
    });
  }

  bookMassage(payload, callback) {
    if (payload.text === 'list') {
      const now = new Date();
      this.bookingRepository.all().catch(callback).then((bookings) => {
        const attachments = bookings.filter(reservation => reservation.dateRange.end > now).sort((a, b) => a.dateRange.start - b.dateRange.start).map((reservation) => {
          const attachment = {
            text: `${timeToString(reservation.dateRange.start)} -> ${timeToString(reservation.dateRange.end)}   ${reservation.user.realName}`,
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
      });
    } else {
      this.findAvailabilities(payload.user_id, 25, (error, nextAvailabilities) => {
        if (error) {
          callback(error);
          return;
        }

        this.bookingRepository.all().catch(callback).then((bookings) => {
          const nextAvailabilityString = timeToString(nextAvailabilities[0]);
          const now = new Date();
          const previousReservation = bookings.filter(booking => booking.dateRange.end > now).find(booking => booking.user.id === payload.user_id);

          const attachments = [
            {
              text: `There is one spot available at ${nextAvailabilityString}, do you want to book it?`,
              color: '#36a64f',
              callback_id: 'book-massage',
              attachment_type: 'default',
              actions: [
                {
                  name: 'book',
                  text: `Yes, book ${timeToString(nextAvailabilities[0])} -> ${timeToString(addMinutes(nextAvailabilities[0], this.bookingDuration))}`,
                  type: 'button',
                  value: nextAvailabilityString,
                },
                {
                  name: 'book',
                  text: 'Pick a another time...',
                  type: 'select',
                  options: nextAvailabilities.map(date => ({
                    text: `${timeToString(date)} -> ${timeToString(addMinutes(date, this.bookingDuration))}`,
                    value: timeToString(date),
                  })),
                },
              ],
            },
          ];

          if (typeof previousReservation !== 'undefined') {
            attachments.push({
              text: `Note: You already have a booking for ${timeToString(previousReservation.dateRange.start)} -> ${timeToString(previousReservation.dateRange.end)}.\nMaking a new booking will cancel the previous ones.`,
              color: '#ffcc00',
            });
          }

          sendMessageToSlackResponseUrl(payload.response_url, { attachments }, callback);
        });
      });
    }
  }

  findAvailabilities(userId, maxAvalaibilities = 10, callback) {
    const minutesPerStep = 5;
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

    this.bookingRepository.all().catch(callback).then((bookings) => {
      while (availabilities.length < maxAvalaibilities && iterator < maxAvalaibilityDate) {
        const dateRange = new DateRange(iterator, addMinutes(iterator, this.bookingDuration));
        const booking = bookings.find(b => b.user.id !== userId && b.dateRange.isIntersecting(dateRange));
        if (typeof booking === 'undefined') {
          availabilities.push(new Date(iterator));
        }
        iterator = addMinutes(iterator, minutesPerStep);
      }
      callback(null, availabilities);
    });
  }

  findUserById(userId, callback) {
    this.slackWebClient.users.info(userId, (error, result) => {
      if (error) {
        callback(undefined);
      } else {
        callback(undefined, new User(result.user.id, result.user.name, result.user.real_name));
      }
    });
  }
}

module.exports = MassageBooking;
