const redis = require('redis');
const Booking = require('../models/booking.js');

class BookingRepository {
  constructor(redisOptions) {
    this.redisOptions = redisOptions;
  }

  add(booking) {
    const thiz = this;
    return new Promise(((resolve, reject) => {
      const redisClient = thiz.createRedisClient((error) => {
        reject(error);
      });

      redisClient.sadd('bookings', booking.toJson(), (error) => {
        if (error) { reject(error); } else { resolve(); }
        redisClient.quit();
      });
    }));
  }

  all() {
    const thiz = this;
    return new Promise(((resolve, reject) => {
      const redisClient = thiz.createRedisClient((error) => {
        reject(error);
      });

      redisClient.smembers('bookings', (error, replies) => {
        if (error) {
          reject(error);
        } else {
          resolve(replies.map(reply => Booking.parseJson(reply)));
        }
        redisClient.quit();
      });
    }));
  }

  createRedisClient(errorCallback) {
    const client = redis.createClient(this.redisOptions);
    client.on('error', errorCallback);
    return client;
  }

  flush() {
    const thiz = this;
    return new Promise(((resolve, reject) => {
      const redisClient = thiz.createRedisClient((error) => {
        reject(error);
      });

      redisClient.del('bookings', (error) => {
        if (error) { reject(error); } else { resolve(); }
        redisClient.quit();
      });
    }));
  }

  remove(booking) {
    const thiz = this;
    return new Promise(((resolve, reject) => {
      const redisClient = thiz.createRedisClient((error) => {
        reject(error);
      });

      redisClient.srem('bookings', booking.toJson(), (error) => {
        if (error) { reject(error); } else { resolve(); }

        redisClient.quit();
      });
    }));
  }
}

module.exports = BookingRepository;
