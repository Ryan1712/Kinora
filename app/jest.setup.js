globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  // react-native-paper's PaperProvider renders SafeAreaProviderCompat, which reads
  // SafeAreaInsetsContext.Consumer and initialWindowMetrics directly (not just the
  // hooks/components below). Those two are plain React.createContext()/values with no
  // native dependency, so it's safe to pull them from the real module here.
  const { SafeAreaInsetsContext } = jest.requireActual('react-native-safe-area-context');
  return {
    SafeAreaInsetsContext,
    initialWindowMetrics: null,
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaConsumer: ({ children }) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  };
});

// react-native-reanimated@4.5.0's official Jest mock transitively requires the real
// react-native-worklets package, which crashes under Jest with a native module init failure.
// This mock's scope is limited to exports exercised by current Reanimated usage; extend if
// a future component uses gesture handlers, measure(), layout animations, or other features.
jest.mock('react-native-worklets', () => ({
  createSerializable: jest.fn((obj) => obj),
  makeShareable: jest.fn((obj) => obj),
  makeShareableCloneOnUIRecursive: jest.fn((obj) => obj),
  isSerializableRef: jest.fn(() => false),
  scheduleOnUI: jest.fn((fn) => fn),
  isWorkletFunction: jest.fn(() => false),
  RuntimeKind: {},
  serializableMappingCache: new Map(),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
