/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { Readable } from 'stream';
import { type ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import moment from 'moment';
import { ApmSynthtracePipelineSchema, ApmSynthtracePipelines } from '@kbn/apm-synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { generateSpanLinksData } from './data_generator';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const baseTime = Date.now() - 1;
  const start = moment(baseTime).subtract(15, 'minutes');
  const end = moment(baseTime);

  const scenarios: ApmSynthtracePipelines[] = [
    ApmSynthtracePipelineSchema.Default,
    ApmSynthtracePipelineSchema.ApmToOtel,
  ];

  describe('Span Links', () => {
    scenarios.forEach((pipeline) => {
      const isDefaultPipeline = pipeline === ApmSynthtracePipelineSchema.Default;

      describe(`contains linked children - ${isDefaultPipeline ? 'elastic APM' : 'Otel'}`, () => {
        let ids: ReturnType<typeof generateSpanLinksData>['ids'];
        let apmSynthtraceEsClient: ApmSynthtraceEsClient;

        before(async () => {
          const spanLinksData = generateSpanLinksData({ start });
          apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

          ids = spanLinksData.ids;

          await apmSynthtraceEsClient.index(
            [
              Readable.from(spanLinksData.events.producerInternalOnly),
              Readable.from(spanLinksData.events.producerExternalOnly),
              Readable.from(spanLinksData.events.producerConsumer),
              Readable.from(spanLinksData.events.producerMultiple),
            ],
            apmSynthtraceEsClient.resolvePipelineType(pipeline)
          );
        });

        after(() => apmSynthtraceEsClient.clean());

        describe('Span links count on traces', () => {
          async function fetchTraces({
            traceId,
            entryTransactionId,
          }: {
            traceId: string;
            entryTransactionId: string;
          }) {
            return await apmApiClient.readUser({
              endpoint: `GET /internal/apm/traces/{traceId}`,
              params: {
                path: { traceId },
                query: {
                  start: start.toISOString(),
                  end: end.toISOString(),
                  entryTransactionId,
                },
              },
            });
          }

          describe('producer-internal-only trace', () => {
            let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
            before(async () => {
              const tracesResponse = await fetchTraces({
                traceId: ids.producerInternalOnly.traceId,
                entryTransactionId: ids.producerInternalOnly.transactionAId,
              });
              traces = tracesResponse.body;
            });

            it('contains two children link on Span A', () => {
              expect(Object.values(traces.traceItems.spanLinksCountById).length).to.equal(1);
              expect(
                traces.traceItems.spanLinksCountById[ids.producerInternalOnly.spanAId]
              ).to.equal(2);
            });
          });

          describe('producer-external-only trace', () => {
            let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
            before(async () => {
              const tracesResponse = await fetchTraces({
                traceId: ids.producerExternalOnly.traceId,
                entryTransactionId: ids.producerExternalOnly.transactionBId,
              });
              traces = tracesResponse.body;
            });

            it('contains two children link on Span B', () => {
              expect(Object.values(traces.traceItems.spanLinksCountById).length).to.equal(2);
              expect(
                traces.traceItems.spanLinksCountById[ids.producerExternalOnly.spanBId]
              ).to.equal(1);
              expect(
                traces.traceItems.spanLinksCountById[ids.producerExternalOnly.transactionBId]
              ).to.equal(1);
            });
          });

          describe('producer-consumer trace', () => {
            let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
            before(async () => {
              const tracesResponse = await fetchTraces({
                traceId: ids.producerConsumer.traceId,
                entryTransactionId: ids.producerConsumer.transactionCId,
              });
              traces = tracesResponse.body;
            });

            it('contains one children link on transaction C and two on span C', () => {
              expect(Object.values(traces.traceItems.spanLinksCountById).length).to.equal(2);
              expect(
                traces.traceItems.spanLinksCountById[ids.producerConsumer.transactionCId]
              ).to.equal(1);
              expect(traces.traceItems.spanLinksCountById[ids.producerConsumer.spanCId]).to.equal(
                1
              );
            });
          });

          describe('consumer-multiple trace', () => {
            let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
            before(async () => {
              const tracesResponse = await fetchTraces({
                traceId: ids.producerMultiple.traceId,
                entryTransactionId: ids.producerMultiple.transactionDId,
              });
              traces = tracesResponse.body;
            });

            it('contains no children', () => {
              expect(Object.values(traces.traceItems.spanLinksCountById).length).to.equal(0);
              expect(
                traces.traceItems.spanLinksCountById[ids.producerMultiple.transactionDId]
              ).to.equal(undefined);
              expect(traces.traceItems.spanLinksCountById[ids.producerMultiple.spanEId]).to.equal(
                undefined
              );
            });
          });
        });

        describe('Span links details', () => {
          async function fetchChildrenAndParentsDetails({
            kuery,
            traceId,
            spanId,
            processorEvent,
          }: {
            kuery: string;
            traceId: string;
            spanId: string;
            processorEvent: ProcessorEvent;
          }) {
            const [childrenLinksResponse, parentsLinksResponse] = await Promise.all([
              await apmApiClient.readUser({
                endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/children',
                params: {
                  path: { traceId, spanId },
                  query: {
                    kuery,
                    start: start.toISOString(),
                    end: end.toISOString(),
                  },
                },
              }),
              apmApiClient.readUser({
                endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents',
                params: {
                  path: { traceId, spanId },
                  query: {
                    kuery,
                    start: start.toISOString(),
                    end: end.toISOString(),
                    processorEvent,
                  },
                },
              }),
            ]);

            return {
              childrenLinks: childrenLinksResponse.body,
              parentsLinks: parentsLinksResponse.body,
            };
          }

          describe('producer-internal-only span links details', () => {
            let transactionALinksDetails: Awaited<
              ReturnType<typeof fetchChildrenAndParentsDetails>
            >;
            let spanALinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
            before(async () => {
              const [transactionALinksDetailsResponse, spanALinksDetailsResponse] =
                await Promise.all([
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerInternalOnly.traceId,
                    spanId: ids.producerInternalOnly.transactionAId,
                    processorEvent: ProcessorEvent.transaction,
                  }),
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerInternalOnly.traceId,
                    spanId: ids.producerInternalOnly.spanAId,
                    processorEvent: ProcessorEvent.span,
                  }),
                ]);
              transactionALinksDetails = transactionALinksDetailsResponse;
              spanALinksDetails = spanALinksDetailsResponse;
            });

            it('returns no links for transaction A', () => {
              expect(transactionALinksDetails.childrenLinks.spanLinksDetails).to.eql([]);
              expect(transactionALinksDetails.parentsLinks.spanLinksDetails).to.eql([]);
            });

            it('returns no parents on Span A', () => {
              expect(spanALinksDetails.parentsLinks.spanLinksDetails).to.eql([]);
            });

            it('returns two children on Span A', () => {
              expect(spanALinksDetails.childrenLinks.spanLinksDetails.length).to.eql(2);
              const serviceCDetails = spanALinksDetails.childrenLinks.spanLinksDetails.find(
                (childDetails) => {
                  return (
                    childDetails.traceId === ids.producerConsumer.traceId &&
                    childDetails.spanId === ids.producerConsumer.transactionCId
                  );
                }
              );
              expect(serviceCDetails?.details).to.eql({
                serviceName: 'producer-consumer',
                agentName: 'ruby',
                transactionId: ids.producerConsumer.transactionCId,
                spanName: 'Transaction C',
                duration: 1000000,
                environment: 'production',
              });

              const serviceDDetails = spanALinksDetails.childrenLinks.spanLinksDetails.find(
                (childDetails) => {
                  return (
                    childDetails.traceId === ids.producerMultiple.traceId &&
                    childDetails.spanId === ids.producerMultiple.transactionDId
                  );
                }
              );
              expect(serviceDDetails?.details).to.eql({
                serviceName: 'consumer-multiple',
                agentName: 'nodejs',
                transactionId: ids.producerMultiple.transactionDId,
                spanName: 'Transaction D',
                duration: 1000000,
                environment: 'production',
              });
            });
          });

          describe('producer-external-only span links details', () => {
            let transactionBLinksDetails: Awaited<
              ReturnType<typeof fetchChildrenAndParentsDetails>
            >;
            let spanBLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
            before(async () => {
              const [transactionALinksDetailsResponse, spanALinksDetailsResponse] =
                await Promise.all([
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerExternalOnly.traceId,
                    spanId: ids.producerExternalOnly.transactionBId,
                    processorEvent: ProcessorEvent.transaction,
                  }),
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerExternalOnly.traceId,
                    spanId: ids.producerExternalOnly.spanBId,
                    processorEvent: ProcessorEvent.span,
                  }),
                ]);
              transactionBLinksDetails = transactionALinksDetailsResponse;
              spanBLinksDetails = spanALinksDetailsResponse;
            });

            it('returns producer-consumer as children of transaction B', () => {
              expect(transactionBLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
            });

            it('returns no parent for transaction B', () => {
              expect(transactionBLinksDetails.parentsLinks.spanLinksDetails).to.eql([]);
            });

            it('returns external parent on Span B', () => {
              expect(spanBLinksDetails.parentsLinks.spanLinksDetails.length).to.be(1);
              expect(spanBLinksDetails.parentsLinks.spanLinksDetails).to.eql([
                { traceId: 'trace#1', spanId: 'span#1' },
              ]);
            });

            it('returns consumer-multiple as child on Span B', () => {
              expect(spanBLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
              expect(spanBLinksDetails.childrenLinks.spanLinksDetails).to.eql([
                {
                  traceId: ids.producerMultiple.traceId,
                  spanId: ids.producerMultiple.spanEId,
                  details: {
                    serviceName: 'consumer-multiple',
                    agentName: 'nodejs',
                    spanName: 'Span E',
                    duration: 100000,
                    spanSubtype: 'http',
                    spanType: 'external',
                    environment: 'production',
                    ...(isDefaultPipeline && {
                      transactionId: ids.producerMultiple.transactionDId,
                    }),
                  },
                },
              ]);
            });
          });

          describe('producer-consumer span links details', () => {
            let transactionCLinksDetails: Awaited<
              ReturnType<typeof fetchChildrenAndParentsDetails>
            >;
            let spanCLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
            before(async () => {
              const [transactionALinksDetailsResponse, spanALinksDetailsResponse] =
                await Promise.all([
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerConsumer.traceId,
                    spanId: ids.producerConsumer.transactionCId,
                    processorEvent: ProcessorEvent.transaction,
                  }),
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerConsumer.traceId,
                    spanId: ids.producerConsumer.spanCId,
                    processorEvent: ProcessorEvent.span,
                  }),
                ]);
              transactionCLinksDetails = transactionALinksDetailsResponse;
              spanCLinksDetails = spanALinksDetailsResponse;
            });

            it('returns producer-internal-only Span A, producer-external-only Transaction B, and External link as parents of Transaction C', () => {
              expect(transactionCLinksDetails.parentsLinks.spanLinksDetails.length).to.be(3);
              expect(transactionCLinksDetails.parentsLinks.spanLinksDetails).to.eql([
                {
                  traceId: ids.producerInternalOnly.traceId,
                  spanId: ids.producerInternalOnly.spanAId,
                  details: {
                    serviceName: 'producer-internal-only',
                    agentName: 'go',
                    spanName: 'Span A',
                    duration: 100000,
                    spanSubtype: 'http',
                    spanType: 'external',
                    environment: 'production',
                    ...(isDefaultPipeline && {
                      transactionId: ids.producerInternalOnly.transactionAId,
                    }),
                  },
                },
                {
                  traceId: ids.producerExternalOnly.traceId,
                  spanId: ids.producerExternalOnly.transactionBId,
                  details: {
                    serviceName: 'producer-external-only',
                    agentName: 'java',
                    transactionId: ids.producerExternalOnly.transactionBId,
                    duration: 1000000,
                    spanName: 'Transaction B',
                    environment: 'production',
                  },
                },
                {
                  traceId: ids.producerConsumer.externalTraceId,
                  spanId: ids.producerExternalOnly.spanBId,
                },
              ]);
            });

            it('returns consumer-multiple Span E as child of Transaction C', () => {
              expect(transactionCLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
              expect(transactionCLinksDetails.childrenLinks.spanLinksDetails).to.eql([
                {
                  traceId: ids.producerMultiple.traceId,
                  spanId: ids.producerMultiple.spanEId,
                  details: {
                    serviceName: 'consumer-multiple',
                    agentName: 'nodejs',
                    spanName: 'Span E',
                    duration: 100000,
                    spanSubtype: 'http',
                    spanType: 'external',
                    environment: 'production',
                    ...(isDefaultPipeline && {
                      transactionId: ids.producerMultiple.transactionDId,
                    }),
                  },
                },
              ]);
            });

            it('returns no child on Span C', () => {
              expect(spanCLinksDetails.parentsLinks.spanLinksDetails.length).to.be(0);
            });

            it('returns consumer-multiple as Child on producer-consumer', () => {
              expect(spanCLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
              expect(spanCLinksDetails.childrenLinks.spanLinksDetails).to.eql([
                {
                  traceId: ids.producerMultiple.traceId,
                  spanId: ids.producerMultiple.transactionDId,
                  details: {
                    serviceName: 'consumer-multiple',
                    agentName: 'nodejs',
                    transactionId: ids.producerMultiple.transactionDId,
                    spanName: 'Transaction D',
                    duration: 1000000,
                    environment: 'production',
                  },
                },
              ]);
            });
          });

          describe('consumer-multiple span links details', () => {
            let transactionDLinksDetails: Awaited<
              ReturnType<typeof fetchChildrenAndParentsDetails>
            >;
            let spanELinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
            before(async () => {
              const [transactionALinksDetailsResponse, spanALinksDetailsResponse] =
                await Promise.all([
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerMultiple.traceId,
                    spanId: ids.producerMultiple.transactionDId,
                    processorEvent: ProcessorEvent.transaction,
                  }),
                  fetchChildrenAndParentsDetails({
                    kuery: '',
                    traceId: ids.producerMultiple.traceId,
                    spanId: ids.producerMultiple.spanEId,
                    processorEvent: ProcessorEvent.span,
                  }),
                ]);
              transactionDLinksDetails = transactionALinksDetailsResponse;
              spanELinksDetails = spanALinksDetailsResponse;
            });

            it('returns producer-internal-only Span A and producer-consumer Span C as parents of Transaction D', () => {
              expect(transactionDLinksDetails.parentsLinks.spanLinksDetails.length).to.be(2);
              expect(transactionDLinksDetails.parentsLinks.spanLinksDetails).to.eql([
                {
                  traceId: ids.producerInternalOnly.traceId,
                  spanId: ids.producerInternalOnly.spanAId,
                  details: {
                    serviceName: 'producer-internal-only',
                    agentName: 'go',
                    spanName: 'Span A',
                    duration: 100000,
                    spanSubtype: 'http',
                    spanType: 'external',
                    environment: 'production',
                    ...(isDefaultPipeline && {
                      transactionId: ids.producerInternalOnly.transactionAId,
                    }),
                  },
                },
                {
                  traceId: ids.producerConsumer.traceId,
                  spanId: ids.producerConsumer.spanCId,
                  details: {
                    serviceName: 'producer-consumer',
                    agentName: 'ruby',
                    spanName: 'Span C',
                    duration: 100000,
                    spanSubtype: 'http',
                    spanType: 'external',
                    environment: 'production',
                    ...(isDefaultPipeline && {
                      transactionId: ids.producerConsumer.transactionCId,
                    }),
                  },
                },
              ]);
            });

            it('returns no children on Transaction D', () => {
              expect(transactionDLinksDetails.childrenLinks.spanLinksDetails.length).to.be(0);
            });

            it('returns producer-external-only Span B and producer-consumer Transaction C as parents of Span E', () => {
              expect(spanELinksDetails.parentsLinks.spanLinksDetails.length).to.be(2);

              expect(spanELinksDetails.parentsLinks.spanLinksDetails).to.eql([
                {
                  traceId: ids.producerExternalOnly.traceId,
                  spanId: ids.producerExternalOnly.spanBId,
                  details: {
                    serviceName: 'producer-external-only',
                    agentName: 'java',
                    spanName: 'Span B',
                    duration: 100000,
                    spanSubtype: 'http',
                    spanType: 'external',
                    environment: 'production',
                    ...(isDefaultPipeline && {
                      transactionId: ids.producerExternalOnly.transactionBId,
                    }),
                  },
                },
                {
                  traceId: ids.producerConsumer.traceId,
                  spanId: ids.producerConsumer.transactionCId,
                  details: {
                    serviceName: 'producer-consumer',
                    agentName: 'ruby',
                    transactionId: ids.producerConsumer.transactionCId,
                    spanName: 'Transaction C',
                    duration: 1000000,
                    environment: 'production',
                  },
                },
              ]);
            });

            it('returns no children on Span E', () => {
              expect(spanELinksDetails.childrenLinks.spanLinksDetails.length).to.be(0);
            });
          });
        });
      });
    });
  });
}
