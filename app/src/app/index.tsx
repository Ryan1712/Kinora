import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

// The root layout's AuthGuard redirects away from this route as soon as the
// session state resolves (to /(auth)/sign-in or /(main)). This screen only
// ever shows briefly during that first render.
export default function RootIndex() {
  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
