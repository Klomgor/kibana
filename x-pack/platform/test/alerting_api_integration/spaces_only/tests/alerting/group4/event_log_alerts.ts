/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/server';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover, getEventLog } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function eventLogAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('eventLog alerts', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should generate expected alert events for normal operation', async () => {
      // pattern of when the alert should fire
      const pattern = {
        instance: [false, true, true, false, false, true, true, true],
      };

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '1s' },
            throttle: null,
            params: {
              pattern,
            },
            actions: [],
          })
        );

      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // wait for the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            // make sure the counts of the # of events per type are as expected
            ['execute', { gte: 12 }],
            ['new-instance', { equal: 2 }],
            ['active-instance', { gte: 5 }],
            ['recovered-instance', { equal: 2 }],
          ]),
        });
      });

      // filter out the execute event actions
      const instanceEvents = events.filter(
        (event: IValidatedEvent) => event?.event?.action !== 'execute'
      );

      // Verify unique executionId generated per `action:execute` grouping
      const eventExecutionIdSet = new Set();
      const totalUniqueExecutionIds = new Set();
      const totalExecutionEventCount = events.filter(
        (event) => event?.event?.action === 'execute'
      ).length;
      events.forEach((event) => {
        totalUniqueExecutionIds.add(event?.kibana?.alert?.rule?.execution?.uuid);
        if (event?.event?.action === 'execute') {
          eventExecutionIdSet.add(event?.kibana?.alert?.rule?.execution?.uuid);
          expect(eventExecutionIdSet.size).to.equal(1);
          eventExecutionIdSet.clear();
        } else {
          eventExecutionIdSet.add(event?.kibana?.alert?.rule?.execution?.uuid);
        }
      });
      // Ensure every execution actually had a unique id from the others
      expect(totalUniqueExecutionIds.size).to.equal(totalExecutionEventCount);

      const allAlertUuids = new Set<string>();
      const currentAlertSpan: {
        alertId?: string;
        start?: string;
        durationToDate?: string;
        uuid?: string;
      } = {};
      const flapping = [];
      for (let i = 0; i < instanceEvents.length; ++i) {
        expect(typeof instanceEvents[i]?.kibana?.alert?.uuid).to.be('string');
        const uuid = instanceEvents[i]?.kibana?.alert?.uuid!;

        flapping.push(instanceEvents[i]?.kibana?.alert?.flapping);
        switch (instanceEvents[i]?.event?.action) {
          case 'new-instance':
            expect(instanceEvents[i]?.kibana?.alerting?.instance_id).to.equal('instance');
            expect(instanceEvents[i]?.kibana?.alert?.flapping).to.equal(false);
            expect(instanceEvents[i]?.event?.end).to.be(undefined);

            // uuid should be unique for new instances, reused for active/recovered
            expect(currentAlertSpan.uuid).to.be(undefined);
            expect(allAlertUuids.has(uuid)).to.be(false);
            allAlertUuids.add(uuid);

            currentAlertSpan.alertId = instanceEvents[i]?.kibana?.alerting?.instance_id;
            currentAlertSpan.start = instanceEvents[i]?.event?.start;
            currentAlertSpan.durationToDate = `${instanceEvents[i]?.event?.duration}`;
            currentAlertSpan.uuid = uuid;
            break;

          case 'active-instance':
            expect(instanceEvents[i]?.kibana?.alerting?.instance_id).to.equal('instance');
            expect(instanceEvents[i]?.event?.start).to.equal(currentAlertSpan.start);
            expect(instanceEvents[i]?.event?.end).to.be(undefined);
            expect(instanceEvents[i]?.kibana?.alert?.uuid).to.be(currentAlertSpan.uuid);

            if (instanceEvents[i]?.event?.duration! !== '0') {
              expect(
                BigInt(instanceEvents[i]?.event?.duration!) >
                  BigInt(currentAlertSpan.durationToDate!)
              ).to.be(true);
            }
            currentAlertSpan.durationToDate = `${instanceEvents[i]?.event?.duration}`;
            break;

          case 'recovered-instance':
            expect(instanceEvents[i]?.kibana?.alerting?.instance_id).to.equal('instance');
            expect(instanceEvents[i]?.event?.start).to.equal(currentAlertSpan.start);
            expect(instanceEvents[i]?.event?.end).not.to.be(undefined);
            expect(instanceEvents[i]?.kibana?.alert?.uuid).to.be(currentAlertSpan.uuid);
            expect(
              new Date(instanceEvents[i]?.event?.end!).valueOf() -
                new Date(instanceEvents[i]?.event?.start!).valueOf()
            ).to.equal(nanosToMillis(instanceEvents[i]?.event?.duration!));
            currentAlertSpan.uuid = undefined;
            break;
        }
      }
      expect(flapping).to.eql(new Array(instanceEvents.length).fill(false));
    });
  });
}
