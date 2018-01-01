const redis = require('redis');
const Booking = require('../models/booking.js');

class BookingRepository {
  constructor() {
    this.redisOptions = { host: 'redis', prefix: 'test' };
  }

  add(booking) {
    const thiz = this;
    return new Promise(((resolve, reject) => {
      const redisClient = thiz.createRedisClient((error) => {
        reject(error);
      });

      redisClient.lpush('bookings', booking.toJson(), () => {
        resolve();
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

      redisClient.lrange('bookings', 0, -1, (err, replies) => {
        resolve(replies.map(reply => Booking.parseJson(reply)));
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

      redisClient.del('bookings', () => {
        resolve();
        redisClient.quit();
      });
    }));
  }
}

module.exports = BookingRepository;
