# Upande Quality Control App — Development Guide

> 🚨 **Expo v54 is in use** — Always check [versioned docs](https://docs.expo.dev/versions/v54.0.0/) before writing code. APIs change significantly between Expo versions.

## Quick Start

```bash
npm install
npx expo start              # Pick: Android emulator, iOS simulator, or Expo Go
npm run lint                # Check TypeScript + ESLint
npm run reset-project       # Wipe app/ and start fresh (caution!)
```

**Platforms:** Android, iOS, Web

---

## Project Overview

**Upande Quality** is a multi-farm QC inspection app for horticultural companies. Users scan bucket QR codes, sample stems, log quality concerns, and the app auto-decides batch actions (accept/quarantine/reject) based on thresholds.

**Key Workflows:**
- **Intake QC**: Scan → load batch → sample & record concerns → auto-action
- **Grading QC**: Scan → record rejection reasons → submit  
- **Inspection Log**: View temperature & cleaning history
- **Station Setup**: Assign user to farm/greenhouse

---

## How Code is Organized

```
/app                    File-based routing (Expo Router v6) → URLs
├─ _layout.tsx          Root auth gate + providers
├─ login.tsx            Frappe password auth
├─ camera-scanner.tsx   Full-screen QR scanner modal
└─ (tabs)/              Tab navigator
    ├─ intake-qc
    ├─ grading-qc
    ├─ inspection-log
    └─ configure-station

/src
├─ core/                Shared infrastructure (don't add domain logic here)
│   ├─ api/             Axios client + interceptors, base URL, cookie mgmt
│   ├─ auth/            Frappe login, auth store (Zustand)
│   ├─ network/         Online/offline detection
│   ├─ storage/         AsyncStorage wrapper (for persistence)
│   ├─ tenant/          Instance URL context (multi-tenant support)
│   ├─ theme/           COLORS, spacing, fonts, borderRadius
│   ├─ ui/              Reusable UI components (Button, Input, Card, etc.)
│   └─ scanning/        QR focus management
│
└─ features/            Domain-specific business logic (add new features here)
    ├─ qc/              Karen QC batch inspection
    ├─ coldroom/        Temperature/cleaning logs
    └─ station/         Farm & greenhouse config
```

---

## Adding New Features: Step-by-Step

### 1. Create a Feature Module

Create a folder in `/src/features/my-feature/` with this structure:

```
/src/features/my-feature/
├─ api.ts               Raw API types + Axios calls
├─ repository.ts        Domain models + transformations  
├─ store.ts             Zustand store (state + actions)
├─ MyFeatureScreen.tsx  React component
└─ types.ts             (optional) Shared TypeScript types
```

### 2. Define API Types (api.ts)

```typescript
// Raw API response types (from backend, snake_case)
export interface RawBucketResponse {
  bucket_number: string
  batch_id: string
  stems_sampled?: number | null
}

// HTTP call
export const myFeatureApi = {
  getBucket: async (bucketId: string) => {
    const { data } = await apiClient.get<RawBucketResponse>(
      `/api/bucket/${bucketId}`
    )
    return data
  },
}
```

### 3. Create Domain Models (repository.ts)

Transform raw API responses into normalized domain models:

```typescript
import * as api from './api'

export interface Bucket {
  bucketNumber: string  // Normalized: camelCase
  batchId: string
  stemsSampled: number | null
}

export const myFeatureRepository = {
  toBucket: (raw: api.RawBucketResponse): Bucket => ({
    bucketNumber: raw.bucket_number,
    batchId: raw.batch_id,
    stemsSampled: raw.stems_sampled ?? 0,
  }),

  loadBucket: async (id: string) => {
    const raw = await api.myFeatureApi.getBucket(id)
    return myFeatureRepository.toBucket(raw)
  },
}
```

### 4. Build State (store.ts)

Use Zustand v5 for global state:

```typescript
import { create } from 'zustand'
import * as repository from './repository'

interface MyFeatureState {
  bucket: Bucket | null
  loading: boolean
  error: string | null
  
  // Actions
  loadBucket: (id: string) => Promise<void>
  clear: () => void
}

export const useMyFeatureStore = create<MyFeatureState>((set, get) => ({
  bucket: null,
  loading: false,
  error: null,

  loadBucket: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const bucket = await repository.loadBucket(id)
      set({ bucket, loading: false })
    } catch (e) {
      set({ 
        loading: false, 
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  },

  clear: () => set({ bucket: null, loading: false, error: null }),
}))
```

### 5. Create the Screen (MyFeatureScreen.tsx)

```typescript
import { useEffect } from 'react'
import { useMyFeatureStore } from './store'
import { Screen, Card, Button } from '@/src/core/ui'

export default function MyFeatureScreen() {
  const { bucket, loading, error, loadBucket } = useMyFeatureStore()

  useEffect(() => {
    loadBucket('some-id')
  }, [])

  return (
    <Screen title="My Feature" loading={loading} error={error}>
      {bucket && (
        <Card>
          <Text>{bucket.bucketNumber}</Text>
        </Card>
      )}
    </Screen>
  )
}
```

### 6. Add Route

Create file: `/app/(tabs)/my-feature.tsx`

```typescript
import MyFeatureScreen from '@/src/features/my-feature/MyFeatureScreen'
export default MyFeatureScreen
```

---

## Common Patterns

### Form Inputs

Use **local state** for individual fields, **store** for significant data:

```typescript
const [input, setInput] = useState('')
const { data, updateData } = useMyStore()

return (
  <>
    <Input value={input} onChangeText={setInput} />
    <Button 
      onPress={() => updateData(input)} 
      loading={loading}
    >
      Save
    </Button>
  </>
)
```

### Loading States

Always show loading indicator during async operations:

```typescript
const { loading } = useMyStore()
return <Screen loading={loading}>...</Screen>
```

### Error Handling

Show user-friendly error messages:

```typescript
const { error } = useMyStore()
if (error) return <Alert severity="error" text={error} />
```

### Offline Detection

Check network store before making API calls:

```typescript
const isOnline = useNetworkStore(s => s.isOnline)

if (!isOnline) {
  return <Alert text="You are offline. Try again when connected." />
}
```

### Styling

Use centralized theme from `/src/core/theme/index.ts`:

```typescript
import { COLORS, spacing, fontSize } from '@/src/core/theme'

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: COLORS.surface,
  },
  text: {
    fontSize: fontSize.body,
    color: COLORS.text,
  },
})
```

### Reusable UI Components

Located in `/src/core/ui/`:

- `<Screen title={} loading={} error={} />` — Page wrapper
- `<Card />` — Rounded white container
- `<Button variant="primary" onPress={} />` — Action button
- `<Input placeholder={} value={} onChangeText={} />`
- `<Dropdown items={[]} value={} onChange={} />`
- `<Alert severity="error" text={} />`
- `<Toast />` — Global notification

---

## File Organization Rules

| Directory | Purpose | Add New Code Here? |
|-----------|---------|------------------|
| `/app` | Routes & navigation | Only if adding new screen route |
| `/src/core` | Shared infrastructure | ❌ No — only refactoring existing utilities |
| `/src/features` | ✅ **New feature modules go here** | YES — domain-specific logic |
| `/src/core/ui` | Shared UI components | Only reusable components used across features |

---

## TypeScript & Linting

This project uses **strict TypeScript** and ESLint:

```bash
npm run lint              # Check all files
npx expo lint --fix       # Auto-fix simple issues
```

**Always export types explicitly:**

```typescript
export interface MyType { /* ... */ }
export const myFunction = () => {}
```

---

## API & Backend

The app talks to a **Frappe backend** via HTTP:

- **Auth:** Frappe session cookie (stored in AsyncStorage)
- **Client:** Axios with 30s timeout
- **Base URL:** Set from tenant context
- **Error Handling:** Network failures → offline banner after 2 consecutive failures

**Key Pattern:**
```
Raw API response (api.ts)
  ↓ Transform
Domain model (repository.ts)
  ↓ Store & use
Zustand actions (store.ts)
  ↓ Consume in UI
Screen component
```

---

## State Management (Zustand v5)

**Core stores you'll use:**

| Store | Use It For |
|-------|-----------|
| `useAuthStore` | Current user, login/logout |
| `useNetworkStore` | Online/offline status |
| `useUserStation` | Current farm & greenhouse |
| `useMyFeatureStore` | Your feature's data |

**Pattern:**
```typescript
const store = useMyStore(state => ({
  data: state.data,
  loading: state.loading,
  loadData: state.loadData,
}))

// Or destructure:
const { data, loading, loadData } = useMyStore()
```

---

## Key Development Notes

✅ **TypeScript strict mode required** — All code must pass `npx expo lint`  
✅ **Async/await only** — AsyncStorage and API calls must be awaited  
✅ **File-based routing** — `/app/my-screen.tsx` → URL `/my-screen`  
✅ **Zustand stores are global** — Avoid circular dependencies  
✅ **Mock data while offline** — App should remain usable without network  
✅ **Frappe API returns snake_case** — Always normalize in repository layer  
✅ **New Arch enabled** — Some native modules may behave differently  

---

## Useful Resources

- [Expo Docs v54](https://docs.expo.dev/versions/v54.0.0/) — Official reference
- [Expo Router](https://docs.expo.dev/router/introduction/) — File-based navigation
- [React Native Docs](https://reactnative.dev/docs/getting-started) — Platform specifics
- [Zustand](https://github.com/pmndrs/zustand) — State management  
- [Axios Docs](https://axios-http.com/) — HTTP client
- [app.json](./app.json) — Project config (iOS/Android settings)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| TypeScript errors | Run `npm run lint --fix` |
| Blank screen on startup | Check `_layout.tsx` providers and auth gate |
| API 401 Unauthorized | Session cookie expired; user needs to re-login |
| Offline banner won't go away | Wait 15s for network check, or toggle airplane mode |
| AsyncStorage undefined | Ensure store action has `await` on storage calls |

---

## When Adding a New Endpoint

1. **Add to `/src/features/*/api.ts`:**
   ```typescript
   export const myApi = {
     callEndpoint: async (params) => {
       const { data } = await apiClient.get('/api/endpoint', { params })
       return data as RawResponse
     }
   }
   ```

2. **Transform in repository.ts:**
   ```typescript
   const model = transform(raw)
   ```

3. **Use in store.ts:**
   ```typescript
   myAction: async () => {
     const raw = await api.callEndpoint()
     const model = repository.transform(raw)
     set({ data: model })
   }
   ```

4. **Consume in component:**
   ```typescript
   const { data } = useMyStore()
   ```

---

## Questions?

Check the [README](./README.md) for project-level info, or explore existing features (`/src/features/qc/`, `/src/features/station/`) for real-world examples.
