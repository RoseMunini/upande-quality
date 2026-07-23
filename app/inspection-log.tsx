import { RequireStation } from '@/src/core/tenant/RequireStation';
import { KarenInspectionLogScreen } from '@/src/features/coldroom/InspectionLogScreen';

export default function InspectionLogRoute() {
  return (
    <RequireStation next="/inspection-log">
      {(station) => <KarenInspectionLogScreen userFarm={station.userFarm} />}
    </RequireStation>
  );
}
