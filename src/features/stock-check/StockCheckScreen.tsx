import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Card, Alert } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { LabeledInput } from '@/src/core/ui/LabeledInput';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useStockCheckStore } from './store';
import type { GreenhouseStock, SalesOrderLine } from './repository';

export function StockCheckScreen() {
  const { showSuccess, showError } = useToast();

  const searchQuery = useStockCheckStore((s) => s.searchQuery);
  const searchResults = useStockCheckStore((s) => s.searchResults);
  const searching = useStockCheckStore((s) => s.searching);
  const selectedOrder = useStockCheckStore((s) => s.selectedOrder);
  const orderLines = useStockCheckStore((s) => s.orderLines);
  const linesLoading = useStockCheckStore((s) => s.linesLoading);
  const stockByLine = useStockCheckStore((s) => s.stockByLine);
  const stockLoading = useStockCheckStore((s) => s.stockLoading);
  const requesting = useStockCheckStore((s) => s.requesting);
  const pendingRequests = useStockCheckStore((s) => s.pendingRequests);
  const pendingRequestsLoading = useStockCheckStore((s) => s.pendingRequestsLoading);
  const resolving = useStockCheckStore((s) => s.resolving);

  const search = useStockCheckStore((s) => s.search);
  const selectOrder = useStockCheckStore((s) => s.selectOrder);
  const clearOrder = useStockCheckStore((s) => s.clearOrder);
  const checkAvailability = useStockCheckStore((s) => s.checkAvailability);
  const sendTransferRequest = useStockCheckStore((s) => s.sendTransferRequest);
  const recordShortfall = useStockCheckStore((s) => s.recordShortfall);
  const loadPendingRequests = useStockCheckStore((s) => s.loadPendingRequests);
  const resolveRequest = useStockCheckStore((s) => s.resolveRequest);

  const [query, setQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [requestQty, setRequestQty] = useState<Record<string, string>>({});
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (showRequests) loadPendingRequests();
  }, [showRequests, loadPendingRequests]);

  const onCheck = async (itemCode: string) => {
    setExpandedItem(itemCode);
    await checkAvailability(itemCode);
  };

  const totalAvailable = (itemCode: string) =>
    (stockByLine[itemCode] ?? []).reduce((sum, gh) => sum + gh.totalStems, 0);

  const onRequest = async (line: SalesOrderLine, gh: GreenhouseStock) => {
    const key = `${line.itemCode}:${gh.greenhouse}`;
    const qty = parseInt(requestQty[key] || '0', 10) || 0;
    if (qty <= 0) {
      showError('Enter a stem quantity to request.');
      return;
    }
    const bucketId = gh.buckets[0]?.bucketId ?? '';
    const outcome = await sendTransferRequest({
      itemCode: line.itemCode,
      greenhouse: gh.greenhouse,
      bucketId,
      stemQty: qty,
    });
    if (outcome.kind === 'error') showError(outcome.message);
    else showSuccess(`Request sent to ${gh.greenhouse}.`);
  };

  const onRecordShortfall = async (line: SalesOrderLine) => {
    const available = totalAvailable(line.itemCode);
    const shortfall = Math.max(line.qty - available, 0);
    const outcome = await recordShortfall({
      itemCode: line.itemCode,
      requiredQty: line.qty,
      availableQty: available,
      shortfallQty: shortfall,
    });
    if (outcome.kind === 'error') showError(outcome.message);
    else showSuccess('Shortfall recorded for follow-up.');
  };

  return (
    <Screen title="Stock Check" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Card title="Find a Sales Order">
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <LabeledInput
              label=""
              value={query}
              onChangeText={setQuery}
              placeholder="Order name or customer…"
              style={{ flex: 1 }}
            />
            <Button label="Search" onPress={() => search(query.trim())} loading={searching} />
          </View>

          {searchResults.map((order) => (
            <Button
              key={order.name}
              label={`${order.name} — ${order.customerName}`}
              variant="outline"
              onPress={() => {
                selectOrder(order);
                setExpandedItem(null);
              }}
              style={{ marginTop: spacing.sm }}
            />
          ))}
        </Card>

        {selectedOrder ? (
          <Card title={selectedOrder.name}>
            <Text style={s.sub}>
              {selectedOrder.customerName} · {selectedOrder.transactionDate} · {selectedOrder.status}
            </Text>
            <Button label="Clear" variant="outline" onPress={clearOrder} style={{ marginTop: spacing.sm }} />
          </Card>
        ) : null}

        {linesLoading ? <Text style={s.help}>Loading order lines…</Text> : null}

        {orderLines.map((line) => {
          const isExpanded = expandedItem === line.itemCode;
          const stock = stockByLine[line.itemCode] ?? [];
          const loadingStock = !!stockLoading[line.itemCode];
          const available = totalAvailable(line.itemCode);
          const short = isExpanded && !loadingStock && available < line.qty;

          return (
            <Card key={line.itemCode}>
              <Text style={s.itemName}>{line.itemName}</Text>
              <Text style={s.sub}>
                Ordered: {line.qty} {line.stockUom}
              </Text>
              <Button
                label={isExpanded ? 'Refresh availability' : 'Check availability'}
                variant="outline"
                onPress={() => onCheck(line.itemCode)}
                loading={loadingStock}
                style={{ marginTop: spacing.sm }}
              />

              {isExpanded && !loadingStock ? (
                <View style={{ marginTop: spacing.sm }}>
                  {stock.length === 0 ? (
                    <Alert tone="warn">No shelved stock of this variety found anywhere.</Alert>
                  ) : (
                    stock.map((gh) => {
                      const key = `${line.itemCode}:${gh.greenhouse}`;
                      return (
                        <View key={gh.greenhouse} style={s.ghRow}>
                          <Text style={s.ghName}>
                            {gh.greenhouse} — {gh.totalStems} stems ({gh.buckets.length} bucket
                            {gh.buckets.length === 1 ? '' : 's'})
                          </Text>
                          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                            <LabeledInput
                              label=""
                              placeholder="Qty"
                              keyboardType="number-pad"
                              value={requestQty[key] ?? ''}
                              onChangeText={(v) => setRequestQty((r) => ({ ...r, [key]: v }))}
                              style={{ flex: 1 }}
                            />
                            <Button
                              label="Request"
                              onPress={() => onRequest(line, gh)}
                              loading={requesting}
                            />
                          </View>
                        </View>
                      );
                    })
                  )}
                  {short ? (
                    <View style={{ marginTop: spacing.sm }}>
                      <Alert tone="warn">
                        Only {available} of {line.qty} needed are available across every greenhouse.
                      </Alert>
                      <Button
                        label="Record shortfall"
                        onPress={() => onRecordShortfall(line)}
                        style={{ marginTop: spacing.sm }}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })}

        <Card>
          <Button
            label={showRequests ? 'Hide pending requests' : 'Show pending requests'}
            variant="outline"
            onPress={() => setShowRequests((v) => !v)}
          />
          {showRequests ? (
            <View style={{ marginTop: spacing.sm }}>
              {pendingRequestsLoading ? <Text style={s.help}>Loading…</Text> : null}
              {!pendingRequestsLoading && pendingRequests.length === 0 ? (
                <Text style={s.help}>No pending requests.</Text>
              ) : null}
              {pendingRequests.map((req) => (
                <View key={req.name} style={s.reqRow}>
                  <Text style={s.itemName}>{req.itemCode}</Text>
                  <Text style={s.sub}>
                    {req.stemQty} stems from {req.sourceGreenhouse || 'unknown'} for {req.salesOrder}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                    <Button
                      label="Reject"
                      variant="outline"
                      onPress={() => resolveRequest(req.name, 'reject')}
                      disabled={resolving}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Fulfill"
                      onPress={() => resolveRequest(req.name, 'fulfill')}
                      disabled={resolving}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  help: { fontSize: 12, color: COLORS.textMuted, marginTop: spacing.xs },
  sub: { fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: 2 },
  itemName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  ghRow: { paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  ghName: { fontSize: fontSize.sm, color: COLORS.text, fontFamily: fontFamily.medium },
  reqRow: { paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
});
