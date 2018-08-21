rivets.configure({
  prefix: 'rv',
  preloadData: true,
  rootInterface: '.',
  templateDelimiters: ['{', '}'],
  iterationAlias(modelName) {
    return `%${modelName}%`;
  },
  handler(target, event, binding) {
    this.call(target, event, binding.view.models);
  },
  executeFunctions: false,
});

rivets.formatters.eq = function (val, arg) {
  return val === arg;
};

rivets.formatters.date = function (value) {
  return moment(value).fromNow();
};

rivets.formatters.time = function (value) {
  return moment(value).format('HH:mm');
};

const state = {
  running: false,
  empty: true,
  current_booking: { user: { realName: 'loading...' } },
  upcoming_bookings: [],
};

const update = function () {
  $.get('/bookings', (data) => {
    window.state.empty = data.bookings.length === 0;
    window.state.current_booking = data.bookings.shift();
    window.state.upcoming_bookings = data.bookings;
    if (typeof window.state.current_booking !== 'undefined') {
      const start = moment(window.state.current_booking.dateRange.start);
      const end = moment(window.state.current_booking.dateRange.end);
      window.state.running = (start < moment() && end > moment());
    } else {
      window.state.running = false;
    }
  });
};

$(() => {
  rivets.bind($('body'), state);
  window.state = state;
  update();
  setInterval(update, 10000);
});
