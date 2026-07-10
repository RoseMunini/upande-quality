import { RequireStation } from '@/src/core/tenant/RequireStation';
import { IntakeQCInspectionScreen } from '@/src/features/intake-qc-inspection/IntakeQCInspectionScreen';

export default function IntakeQcInspectionRoute() {
  return (
    <RequireStation next="/intake-qc-inspection">
      {() => <IntakeQCInspectionScreen />}
    </RequireStation>
  );
}
