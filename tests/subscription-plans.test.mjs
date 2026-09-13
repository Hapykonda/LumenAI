import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSubscriptionPlan, subscriptionPlanLabel } from '../lib/subscription-plans.ts';

test('current and legacy plan links select the same membership', () => {
  for (const [current, legacy, label] of [['start','inicio','Start'],['business','crecimiento','Business'],['scale','escala','Scale']]) {
    assert.equal(normalizeSubscriptionPlan(current), current);
    assert.equal(normalizeSubscriptionPlan(legacy), current);
    assert.equal(subscriptionPlanLabel(current), label);
  }
});

test('unknown or prototype names never become a selected membership', () => {
  for (const value of [null, '', 'enterprise', '__proto__', 'constructor', 'toString']) {
    assert.equal(normalizeSubscriptionPlan(value), null);
  }
});
