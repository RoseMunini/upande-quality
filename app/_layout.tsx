import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import 'react-native-gesture-handler';
import { TenantProvider } from '@/src/core/tenant/tenant-context';
import { ToastProvider } from '@/src/core/ui/Toast';
import { OfflineBanner } from '@/src/core/ui/OfflineBanner';
import { ProfileDrawer } from '@/src/core/ui/ProfileDrawer';
import { useAuthStore } from '@/src/core/auth/store';
import { useNetworkStore } from '@/src/core/network/store';

// Hold the native splash until fonts + auth hydrated.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  // eslint-disable-next-line no-console
  console.log('[boot] render', { fontsLoaded });

  const hydrate = useAuthStore((s) => s.hydrate);
  const hasSession = useAuthStore((s) => s.hasSession);
  const hydrated = useAuthStore((s) => s.hydrated);
  const initNetwork = useNetworkStore((s) => s.init);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[boot] calling hydrate()');
    hydrate().then(
      () => console.log('[boot] hydrate() resolved'),
      (err) => console.log('[boot] hydrate() rejected', err),
    );
    // eslint-disable-next-line no-console
    console.log('[boot] calling initNetwork()');
    initNetwork();
    // eslint-disable-next-line no-console
    console.log('[boot] initNetwork() returned (fire-and-forget)');
  }, [hydrate, initNetwork]);

  useEffect(() => {
    if (fontsLoaded && hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, hydrated]);

  // Single-farm build: password-only auth gate. Routes to login <-> tabs
  // based on session state. No biometric-lock screen (see auth/store.ts).
  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0] as string | undefined;

    if (!hasSession) {
      if (first !== 'login') router.replace('/login');
      return;
    }
    if (first === 'login') router.replace('/');
  }, [hydrated, hasSession, segments, router]);

  if (!fontsLoaded || !hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TenantProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
              }}
            >
              {/* Bottom tab navigator — all main feature screens live inside. */}
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" />
              <Stack.Screen
                name="camera-scanner"
                options={{ presentation: 'fullScreenModal' }}
              />
            </Stack>
            {/* Sticky offline indicator across every screen. */}
            <OfflineBanner />
            {/* Slide-out profile menu, triggered from each screen's header. */}
            <ProfileDrawer />
          </ToastProvider>
        </TenantProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
