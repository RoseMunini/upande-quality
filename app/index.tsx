import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/core/auth/store';

// Android cold-launches every app at "/". Without a route here, expo-router
// falls back to its internal not-found screen, which lives outside the root
// layout — so the effect that hides the splash screen (in app/_layout.tsx)
// never mounts and the app stays hidden behind the logo forever.
export default function Index() {
  const hasSession = useAuthStore((s) => s.hasSession);
  return <Redirect href={hasSession ? '/(tabs)/home' : '/login'} />;
}
