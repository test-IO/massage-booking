const Booking = require('../models/booking');
const BookingRepository = require('../services/booking_repository');
const DateRange = require('../models/date_range');
const request = require('request');
const User = require('../models/user');

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (60000 * minutes));
}

function findAvailabilitiesForUserId(bookings, userId, bookingDuration, maxAvalaibilities = 10, minutesPerStep = 5) {
  const availabilities = [];
  let iterator = new Date();
  const maxAvalaibilityDate = addMinutes(new Date(), 3600 * 24);

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
    const dateRange = new DateRange(iterator, addMinutes(iterator, bookingDuration));
    const booking = bookings.find(b => b.user.id !== userId && b.dateRange.isIntersecting(dateRange));
    if (typeof booking === 'undefined') {
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

function timeToString(date) {
  if (date.getMinutes() < 10) {
    return `${date.getHours()}:0${date.getMinutes()}`;
  }
  return `${date.getHours()}:${date.getMinutes()}`;
}


class MassageBooking {
  constructor(slackWebClient, redisOptions, bookingDuration = 20) {
    this.bookingDuration = bookingDuration;
    this.bookingRepository = new BookingRepository(redisOptions);
    this.slackWebClient = slackWebClient;
  }

  actionHandler(payload, callback) {
    const selectedDate = new Date(payload.actions[0].type === 'select' ? payload.actions[0].selected_options[0].value : payload.actions[0].value);
    const dateRange = new DateRange(selectedDate, addMinutes(selectedDate, this.bookingDuration));

    this.bookingRepository.all().catch(callback).then((bookings) => {
      const overlappingBooking = bookings.find(b => b.user.id !== payload.user.id && b.dateRange.isIntersecting(dateRange));
      if (typeof overlappingBooking === 'undefined') {
        this.findUserById(payload.user.id, (error, user) => {
          if (error) {
            callback(error);
            return;
          }

          const now = new Date();
          const previousBooking = bookings.filter(booking => booking.dateRange.end > now)
            .find(booking => booking.user.id === user.id);

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
            if (typeof previousBooking === 'undefined') {
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
    if (['list', 'ls', 'miaouuu'].includes(payload.text)) {
      const now = new Date();
      this.bookingRepository.all().catch(callback).then((bookings) => {
        const attachments = bookings.filter(booking => booking.dateRange.end > now).sort((a, b) => a.dateRange.start - b.dateRange.start).map((booking) => {
          const attachment = {
            text: `${timeToString(booking.dateRange.start)} -> ${timeToString(booking.dateRange.end)}   ${booking.user.realName}`,
          };
          if (booking.user.id === payload.user_id) {
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
      this.bookingRepository.all().catch(callback).then((bookings) => {
        const nextAvailabilities = findAvailabilitiesForUserId(bookings, payload.user_id, this.bookingDuration, 25);
        const now = new Date();
        const previousBooking = bookings.filter(booking => booking.dateRange.end > now).find(booking => booking.user.id === payload.user_id);

        const attachments = [
          {
            text: `There is one spot available at ${timeToString(nextAvailabilities[0])}, do you want to book it?`,
            color: '#36a64f',
            callback_id: 'book-massage',
            attachment_type: 'default',
            actions: [
              {
                name: 'book',
                text: `Yes, book ${timeToString(nextAvailabilities[0])} -> ${timeToString(addMinutes(nextAvailabilities[0], this.bookingDuration))}`,
                type: 'button',
                value: nextAvailabilities[0],
              },
              {
                name: 'book',
                text: 'Pick another time...',
                type: 'select',
                options: nextAvailabilities.map(date => ({
                  text: `${timeToString(date)} -> ${timeToString(addMinutes(date, this.bookingDuration))}`,
                  value: date,
                })),
              },
            ],
          },
        ];

        if (typeof previousBooking !== 'undefined') {
          attachments.push({
            text: `Note: You already have a booking for ${timeToString(previousBooking.dateRange.start)} -> ${timeToString(previousBooking.dateRange.end)}.\nMaking a new booking will cancel the previous ones.`,
            color: '#ffcc00',
          });
        }

        sendMessageToSlackResponseUrl(payload.response_url, { attachments }, callback);
      });
    }
  }

  notifyUserOfBooking() {
    return new Promise((resolve, reject) => {
      this.bookingRepository.all().catch(reject).then((bookings) => {
        const now = new Date();
        const booking = bookings.find(b => b.dateRange.start < now && b.dateRange.end > now);

        if (typeof booking !== 'undefined') {
          if (typeof this.lastNotifiedBooking === 'undefined' || !this.lastNotifiedBooking.isEqual(booking)) {
            this.slackWebClient.chat.postMessage(booking.user.id, 'The chair is waiting for you, go get your massage :massage:', (err, res) => {
              if (err) {
                reject(err);
              } else {
                this.lastNotifiedBooking = booking;
                resolve(res);
              }
            });
          } else { resolve(); }
        } else { resolve(); }
      });
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
