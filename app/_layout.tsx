import { SensorProvider } from '@/context/SensorContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <SensorProvider>
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <StatusBar style="light" backgroundColor={Colors.bg} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </SensorProvider>
  );
}