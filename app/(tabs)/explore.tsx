import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function TabTwoScreen() {
  const url = 'https://donshowi.github.io/prueba/';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Euler Web"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView source={{ uri: url }} style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
