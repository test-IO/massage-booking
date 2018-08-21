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

rivets.formatters.eq = (val, arg) => val === arg;
rivets.formatters.date = value => moment(value).fromNow();
rivets.formatters.time = value => moment(value).format('HH:mm');

const state = {
  running: false,
  empty: true,
  current_booking: { user: { realName: 'loading...' } },
  upcoming_bookings: [],
};

const update = () => {
  $.get('/bookings', (data) => {
    state.empty = data.bookings.length === 0;
    state.current_booking = data.bookings.shift();
    state.upcoming_bookings = data.bookings;
    if (typeof state.current_booking !== 'undefined') {
      const start = moment(state.current_booking.dateRange.start);
      const end = moment(state.current_booking.dateRange.end);
      state.running = (start < moment() && end > moment());
    } else {
      state.running = false;
    }
  });
};

$(() => {
  rivets.bind($('body'), state);
  update();
  setInterval(update, 10000);
  setTimeout(() => {
    $('#container').show();
  }, 100);
});
