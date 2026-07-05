globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaConsumer: ({ children }) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  };
});

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
