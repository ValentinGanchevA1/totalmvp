// Manual mock for react-native-gesture-handler that avoids loading native TurboModules.
const React = require('react');
const { View, TouchableOpacity, ScrollView, FlatList } = require('react-native');

const stub = (name) => {
  const Comp = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  );
  Comp.displayName = name;
  return Comp;
};

module.exports = {
  GestureHandlerRootView: stub('GestureHandlerRootView'),
  Swipeable: stub('Swipeable'),
  DrawerLayout: stub('DrawerLayout'),
  State: {},
  ScrollView,
  Slider: stub('Slider'),
  Switch: stub('Switch'),
  TextInput: stub('TextInput'),
  ToolbarAndroid: stub('ToolbarAndroid'),
  ViewPagerAndroid: stub('ViewPagerAndroid'),
  DrawerLayoutAndroid: stub('DrawerLayoutAndroid'),
  WebView: stub('WebView'),
  NativeViewGestureHandler: stub('NativeViewGestureHandler'),
  TapGestureHandler: stub('TapGestureHandler'),
  FlingGestureHandler: stub('FlingGestureHandler'),
  ForceTouchGestureHandler: stub('ForceTouchGestureHandler'),
  LongPressGestureHandler: stub('LongPressGestureHandler'),
  PanGestureHandler: stub('PanGestureHandler'),
  PinchGestureHandler: stub('PinchGestureHandler'),
  RotationGestureHandler: stub('RotationGestureHandler'),
  RawButton: stub('RawButton'),
  BaseButton: stub('BaseButton'),
  RectButton: stub('RectButton'),
  BorderlessButton: stub('BorderlessButton'),
  TouchableOpacity: stub('TouchableOpacity'),
  TouchableHighlight: stub('TouchableHighlight'),
  TouchableNativeFeedback: stub('TouchableNativeFeedback'),
  TouchableWithoutFeedback: stub('TouchableWithoutFeedback'),
  FlatList,
  gestureHandlerRootHOC: (Comp) => Comp,
  Directions: {},
  GestureDetector: stub('GestureDetector'),
  Gesture: { Tap: () => ({ onStart: () => ({}) }), Pan: () => ({}) },
};
