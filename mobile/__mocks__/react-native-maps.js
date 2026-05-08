const React = require('react');
const { View } = require('react-native');

const mock = (name) => {
  const Comp = (props) => React.createElement(View, props);
  Comp.displayName = name;
  return Comp;
};

module.exports = {
  __esModule: true,
  default: mock('MapView'),
  Marker: mock('Marker'),
  Callout: mock('Callout'),
  Circle: mock('Circle'),
  Polygon: mock('Polygon'),
  Polyline: mock('Polyline'),
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: null,
};
