/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import beatDetailFixture from './fixtures/detail.json';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('instance detail', () => {
    const archive =
      'x-pack/platform/test/fixtures/es_archives/monitoring/beats_with_restarted_instance';
    const timeRange = {
      min: '2018-02-09T20:49:00Z',
      max: '2018-02-09T21:50:00Z',
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should summarize beat with metrics', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/fHJwISmKTFO8bj57oFBLUQ/beats/beat/60599a4f-8139-4251-b0b9-15866df34221'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(beatDetailFixture);
    });
  });
}
