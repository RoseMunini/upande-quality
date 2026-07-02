import { stationApi } from './api';

export type Farm = { name: string; farmName: string };

export const stationRepository = {
  async fetchFarms(): Promise<Farm[]> {
    const raw = await stationApi.fetchFarms();
    return (raw.data ?? []).map((f) => ({
      name: f.name,
      farmName: f.farm_name ?? f.name,
    }));
  },

  /**
   * Returns the names of all greenhouse-class warehouses (those starting with
   * "GHSE" or containing "GH"). Filtered per-farm below once a farm is picked.
   */
  async fetchGreenhouseWarehouses(): Promise<string[]> {
    const raw = await stationApi.fetchWarehouses();
    const all = raw.data ?? [];
    return all
      .map((w) => w.name)
      .filter((name) => name.startsWith('GHSE') || name.includes('GH'));
  },

  /**
   * Single-farm build: hardcoded to the Karen pattern (warehouse name starts
   * with the farm name). If this app targets a farm that behaves like
   * Xflora (no per-greenhouse station — farm-only) or Kikwetu (EX-suffix
   * filtering), this needs to change — see the original multi-tenant
   * `filterGreenhousesForFarm` in upande-quality for those branches.
   */
  filterGreenhousesForFarm(farm: string, greenhouses: string[]): string[] {
    if (!farm) return [];
    return greenhouses.filter((g) => g.startsWith(farm));
  },
};
