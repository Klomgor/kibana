/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');
  const supertest = getService('supertest');

  /*
   * The tests server config implements a network policy that is designed to disallow the following Canvas worksheet
   */

  describe('Network Policy violation', () => {
    before(async () => {
      await reportingAPI.initLogs(); // includes a canvas worksheet with an offending image URL
    });

    after(async () => {
      await reportingAPI.teardownLogs();
    });

    it('should fail job when page violates the network policy', async () => {
      const downloadPath = await reportingAPI.postJob(
        `/api/reporting/generate/printablePdfV2?jobParams=(layout:(dimensions:(height:720,width:1080),id:preserve_layout),locatorParams:!((id:CANVAS_APP_LOCATOR,params:(id:workpad-e7464259-0b75-4b8c-81c8-8422b15ff201,page:1,view:workpadPDF),version:'8.16.0')),objectType:'canvas workpad',title:'Workpad of Death',version:'8.16.0')`
      );

      // Retry the download URL until a "failed" response status is returned
      let body: any;
      await retry.tryForTime(120000, async () => {
        body = (await supertest.get(downloadPath).expect(500)).body;
      });

      expect(body.message).to.match(
        /Reporting generation failed: ReportingError\(code: disallowed_outgoing_url_error\)/
      );
    });
  });
}
