/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering a chart of anomalies in the raw data in
 * the Machine Learning Explorer dashboard.
 */

import PropTypes from 'prop-types';
import React from 'react';

import d3 from 'd3';
import moment from 'moment';

import { EuiPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import {
  getFormattedSeverityScore,
  getSeverityWithLow,
  getThemeResolvedSeverityColor,
} from '@kbn/ml-anomaly-utils';
import { formatHumanReadableDateTime } from '@kbn/ml-date-utils';
import { context } from '@kbn/kibana-react-plugin/public';

import { getTableItemClosestToTimestamp } from '../../../../common/util/anomalies_table_utils';

import { LinksMenuUI } from '../../components/anomalies_table/links_menu';
import { RuleEditorFlyout } from '../../components/rule_editor';
import { formatValue } from '../../formatters/format_value';
import {
  getChartType,
  getTickValues,
  numTicksForDateFormat,
  removeLabelOverlap,
  chartExtendedLimits,
  LINE_CHART_ANOMALY_RADIUS,
} from '../../util/chart_utils';
import { LoadingIndicator } from '../../components/loading_indicator/loading_indicator';

import { CHART_TYPE } from '../explorer_constants';
import { CHART_HEIGHT, TRANSPARENT_BACKGROUND } from './constants';
import { filter } from 'rxjs';
import { drawCursor } from './utils/draw_anomaly_explorer_charts_cursor';
import { SCHEDULE_EVENT_MARKER_ENTITY } from '../../../../common/constants/charts';
import { cssMlExplorerChart } from './explorer_chart_styles';

const popoverMenuOffset = 0;
const CONTENT_WRAPPER_HEIGHT = 215;
const SCHEDULED_EVENT_MARKER_HEIGHT = 5;

// If a rare/event-distribution chart has a cardinality of 10 or less,
// then the chart will display the y axis labels for each lane of events.
// If cardinality is higher, then the axis will just be hidden.
// Cardinality in this case refers to the available for display,
// not the cardinality of the full source data set.
const Y_AXIS_LABEL_THRESHOLD = 10;

export class ExplorerChartDistribution extends React.Component {
  static contextType = context;

  static propTypes = {
    seriesConfig: PropTypes.object,
    severity: PropTypes.array,
    tableData: PropTypes.object,
    tooltipService: PropTypes.object.isRequired,
    cursor$: PropTypes.object,
    euiTheme: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.chartScales = undefined;
    this.cursorStateSubscription = undefined;
    this.state = { popoverData: null, popoverCoords: [0, 0], showRuleEditorFlyout: () => {} };
  }

  componentDidMount() {
    this.renderChart();
    this.cursorStateSubscription = this.props.cursor$
      .pipe(filter((c) => c.isDateHistogram))
      .subscribe((cursor) => {
        drawCursor(
          cursor.cursor,
          this.rootNode,
          this.props.id,
          this.props.seriesConfig,
          this.chartScales,
          this.props.chartTheme
        );
      });
  }

  componentWillUnmount() {
    this.cursorStateSubscription?.unsubscribe();
  }

  componentDidUpdate() {
    this.renderChart();
  }

  renderChart() {
    const {
      tooManyBuckets,
      tooltipService,
      timeBuckets,
      showSelectedInterval,
      onPointerUpdate,
      id: chartId,
    } = this.props;

    const element = this.rootNode;
    const config = this.props.seriesConfig;
    const severity = this.props.severity;
    const euiTheme = this.props.euiTheme;

    if (typeof config === 'undefined' || Array.isArray(config.chartData) === false) {
      // just return so the empty directive renders without an error later on
      return;
    }

    const fieldFormat = this.context.services.mlServices.mlFieldFormatService.getFieldFormat(
      config.jobId,
      config.detectorIndex
    );

    let vizWidth = 0;
    const chartType = getChartType(config);

    // Left margin is adjusted later for longest y-axis label.
    const margin = { top: 10, right: 0, bottom: 30, left: 0 };
    if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
      margin.left = 60;
    }

    let lineChartXScale = null;
    let lineChartYScale = null;
    let lineChartGroup;
    let lineChartValuesLine = null;

    const CHART_Y_ATTRIBUTE = chartType === CHART_TYPE.EVENT_DISTRIBUTION ? 'entity' : 'value';

    let highlight = config.chartData.find((d) => d.anomalyScore !== undefined);
    highlight = highlight && highlight.entity;

    const filteredChartData = init(config);
    drawRareChart(filteredChartData);

    function init({ chartData, functionDescription }) {
      // Clear any existing elements from the visualization,
      // then build the svg elements for the chart.
      const chartElement = d3.select(element).select('.content-wrapper');
      chartElement.select('svg').remove();

      const svgWidth = element.clientWidth;
      const svgHeight = CHART_HEIGHT + margin.top + margin.bottom;

      const svg = chartElement
        .append('svg')
        .classed('ml-explorer-chart-svg', true)
        .attr('id', 'ml-explorer-chart-svg' + chartId)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

      const categoryLimit = 30;
      const scaleCategories = d3
        .nest()
        .key((d) => d.entity)
        .entries(chartData)
        .sort((a, b) => {
          // To display calendar event markers we populate the chart with fake data points.
          // If a category has fake data points, it should be sorted to the end.
          const aHasFakeData = a.values.some((d) => d.entity === SCHEDULE_EVENT_MARKER_ENTITY);
          const bHasFakeData = b.values.some((d) => d.entity === SCHEDULE_EVENT_MARKER_ENTITY);

          if (aHasFakeData && !bHasFakeData) {
            return 1;
          }

          if (bHasFakeData && !aHasFakeData) {
            return -1;
          }

          return b.values.length - a.values.length;
        })
        .filter((d, i) => {
          // only filter for rare charts
          if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
            return (
              i < categoryLimit ||
              d.key === highlight ||
              d.values.some((d) => d.entity === SCHEDULE_EVENT_MARKER_ENTITY)
            );
          }
          return true;
        })
        .map((d) => d.key);

      chartData = chartData.filter((d) => {
        return scaleCategories.includes(d.entity);
      });

      if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
        const focusData = chartData.filter((d) => {
          return d.entity === highlight;
        });
        // calculate the max y domain based on value, typical, and actual
        // also sets the min to be at least 0 if the series function type is `count`
        const { min: yScaleDomainMin, max: yScaleDomainMax } = chartExtendedLimits(
          focusData,
          functionDescription
        );
        // now again filter chartData to include only the data points within the domain
        chartData = chartData.filter((d) => {
          return d.value <= yScaleDomainMax;
        });

        lineChartYScale = d3.scale
          .linear()
          .range([CHART_HEIGHT, 0])
          .domain([yScaleDomainMin < 0 ? yScaleDomainMin : 0, yScaleDomainMax])
          .nice();
      } else if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
        // avoid overflowing the border of the highlighted area
        const rowMargin = 5;
        lineChartYScale = d3.scale
          .ordinal()
          .rangePoints([rowMargin, CHART_HEIGHT - rowMargin])
          .domain(scaleCategories);
      } else {
        throw new Error(`chartType '${chartType}' not supported`);
      }

      const yAxis = d3.svg
        .axis()
        .scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10);

      let maxYAxisLabelWidth = 0;
      const tempLabelText = svg.append('g').attr('class', 'temp-axis-label tick');
      const tempLabelTextData =
        chartType === CHART_TYPE.POPULATION_DISTRIBUTION
          ? lineChartYScale.ticks()
          : scaleCategories;
      tempLabelText
        .selectAll('text.temp.axis')
        .data(tempLabelTextData)
        .enter()
        .append('text')
        .text((d) => {
          if (fieldFormat !== undefined) {
            return fieldFormat.convert(d, 'text');
          } else {
            if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
              return lineChartYScale.tickFormat()(d);
            }
            return d;
          }
        })
        // Don't use an arrow function since we need access to `this`.
        .each(function () {
          maxYAxisLabelWidth = Math.max(
            this.getBBox().width + yAxis.tickPadding(),
            maxYAxisLabelWidth
          );
        })
        .remove();
      d3.select('.temp-axis-label').remove();

      // Set the size of the left margin according to the width of the largest y axis tick label
      // if the chart is either a population chart or a rare chart below the cardinality threshold.
      if (
        chartType === CHART_TYPE.POPULATION_DISTRIBUTION ||
        (chartType === CHART_TYPE.EVENT_DISTRIBUTION &&
          scaleCategories.length <= Y_AXIS_LABEL_THRESHOLD)
      ) {
        margin.left = Math.max(maxYAxisLabelWidth, 40);
      }
      vizWidth = svgWidth - margin.left - margin.right;

      // Set the x axis domain to match the request plot range.
      // This ensures ranges on different charts will match, even when there aren't
      // data points across the full range, and the selected anomalous region is centred.
      lineChartXScale = d3.time
        .scale()
        .range([0, vizWidth])
        .domain([config.plotEarliest, config.plotLatest]);

      lineChartValuesLine = d3.svg
        .line()
        .x((d) => lineChartXScale(d.date))
        .y((d) => lineChartYScale(d[CHART_Y_ATTRIBUTE]))
        .defined((d) => d.value !== null);

      lineChartGroup = svg
        .append('g')
        .attr('class', 'line-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      return chartData;
    }

    function drawRareChart(data) {
      // Add border round plot area.
      lineChartGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', CHART_HEIGHT)
        .attr('width', vizWidth)
        .style('stroke', euiTheme.colors.lightestShade)
        .style('fill', 'none')
        .style('stroke-width', 1);

      drawRareChartAxes();
      drawRareChartHighlightedSpan();
      drawCursorListener(lineChartGroup);
      drawRareChartDots(data, lineChartGroup, lineChartValuesLine);
      drawRareChartMarkers(data);
    }

    function drawCursorListener(lineChartGroup) {
      lineChartGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', CHART_HEIGHT)
        .attr('width', vizWidth)
        .on('mouseout', function () {
          onPointerUpdate({
            chartId: 'ml-anomaly-chart-metric',
            scale: 'time',
            smHorizontalValue: null,
            smVerticalValue: null,
            type: 'Out',
            unit: undefined,
          });
        })
        .on('mousemove', function () {
          const mouse = d3.mouse(this);

          if (onPointerUpdate) {
            onPointerUpdate({
              chartId: 'ml-anomaly-chart-metric',
              scale: 'time',
              smHorizontalValue: null,
              smVerticalValue: null,
              type: 'Over',
              unit: undefined,
              x: moment(lineChartXScale.invert(mouse[0])).unix() * 1000,
            });
          }
        })
        .style('fill', TRANSPARENT_BACKGROUND);
    }

    function drawRareChartAxes() {
      // Get the scaled date format to use for x axis tick labels.
      const bounds = { min: moment(config.plotEarliest), max: moment(config.plotLatest) };
      timeBuckets.setBounds(bounds);
      timeBuckets.setInterval('auto');
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();

      const tickValuesStart = Math.max(config.selectedEarliest, config.plotEarliest);
      // +1 ms to account for the ms that was subtracted for query aggregations.
      const interval = config.selectedLatest - config.selectedEarliest + 1;

      const xAxis = d3.svg
        .axis()
        .scale(lineChartXScale)
        .orient('bottom')
        .innerTickSize(-CHART_HEIGHT)
        .outerTickSize(0)
        .tickPadding(10)
        .tickFormat((d) => moment(d).format(xAxisTickFormat));

      // With tooManyBuckets, or when the chart is used as an embeddable,
      // the chart would end up with no x-axis labels because the ticks are based on the span of the
      // emphasis section, and the selected area spans the whole chart.
      const useAutoTicks =
        tooManyBuckets === true || interval >= config.plotLatest - config.plotEarliest;
      if (useAutoTicks === false) {
        const tickValues = getTickValues(
          tickValuesStart,
          interval,
          config.plotEarliest,
          config.plotLatest
        );
        xAxis.tickValues(tickValues);
      } else {
        xAxis.ticks(numTicksForDateFormat(vizWidth, xAxisTickFormat));
      }

      const yAxis = d3.svg
        .axis()
        .scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10)
        .tickFormat((d) => (d === SCHEDULE_EVENT_MARKER_ENTITY ? null : d));

      if (fieldFormat !== undefined) {
        yAxis.tickFormat((d) => fieldFormat.convert(d, 'text'));
      }

      const axes = lineChartGroup.append('g');

      const gAxis = axes
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + CHART_HEIGHT + ')')
        .call(xAxis);

      axes.append('g').attr('class', 'y axis').call(yAxis);

      // emphasize the y axis label this rare chart is actually about
      if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
        axes
          .select('.y')
          .selectAll('text')
          .each(function (d) {
            d3.select(this).classed('ml-explorer-chart-axis-emphasis', d === highlight);
          });
      }

      if (useAutoTicks === false) {
        removeLabelOverlap(gAxis, tickValuesStart, interval, vizWidth);
      }
    }

    function drawRareChartDots(dotsData, rareChartGroup, rareChartValuesLine, radius = 1.5) {
      // check if `g.values-dots` already exists, if not create it
      // in both cases assign the element to `dotGroup`
      const dotGroup = rareChartGroup.select('.values-dots').empty()
        ? rareChartGroup.append('g').classed('values-dots', true)
        : rareChartGroup.select('.values-dots');

      // use d3's enter/update/exit pattern to render the dots
      const dots = dotGroup.selectAll('circle').data(dotsData);

      dots
        .enter()
        .append('circle')
        .classed('values-dots-circle', true)
        .classed('values-dots-circle-blur', (d) => {
          return d.entity !== highlight;
        })
        .attr('r', (d) => (d.entity === highlight ? radius * 1.5 : radius));

      dots.attr('cx', rareChartValuesLine.x()).attr('cy', rareChartValuesLine.y());

      dots.exit().remove();
    }

    const that = this;

    function drawRareChartHighlightedSpan() {
      if (showSelectedInterval === false) return;
      // Draws a rectangle which highlights the time span that has been selected for view.
      // Note depending on the overall time range and the bucket span, the selected time
      // span may be longer than the range actually being plotted.
      const rectStart = Math.max(config.selectedEarliest, config.plotEarliest);
      const rectEnd = Math.min(config.selectedLatest, config.plotLatest);
      const rectWidth = lineChartXScale(rectEnd) - lineChartXScale(rectStart);

      lineChartGroup
        .append('rect')
        .attr('class', 'selected-interval')
        .attr('x', lineChartXScale(new Date(rectStart)) + 2)
        .attr('y', 2)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('width', rectWidth - 4)
        .attr('height', CHART_HEIGHT - 4);
    }

    function drawRareChartMarkers(data) {
      // Render circle markers for the points.
      // These are used for displaying tooltips on mouseover.
      // Don't render dots where value=null (data gaps)
      const dots = lineChartGroup
        .append('g')
        .attr('class', 'chart-markers')
        .selectAll('.metric-value')
        .data(data.filter((d) => d.value !== null));

      // Remove dots that are no longer needed i.e. if number of chart points has decreased.
      dots.exit().remove();
      // Create any new dots that are needed i.e. if number of chart points has increased.
      dots
        .enter()
        .append('circle')
        .attr('r', LINE_CHART_ANOMALY_RADIUS)
        .on('click', function (d) {
          d3.event.preventDefault();
          if (d.anomalyScore === undefined) return;
          showAnomalyPopover(d, this);
        })
        // Don't use an arrow function since we need access to `this`.
        .on('mouseover', function (d) {
          showLineChartTooltip(d, this);
        })
        .on('mouseout', () => tooltipService.hide());

      // Update all dots to new positions.
      dots
        .attr('cx', (d) => lineChartXScale(d.date))
        .attr('cy', (d) => lineChartYScale(d[CHART_Y_ATTRIBUTE]))
        .attr('class', (d) => {
          let markerClass = 'metric-value';
          if (d.anomalyScore !== undefined) {
            // Check if the anomaly score falls within any of the selected severity ranges
            const anomalyScore = Number(d.anomalyScore);
            const isInSelectedRange = severity.some((s) => {
              return anomalyScore >= s.min && (s.max === undefined || anomalyScore <= s.max);
            });
            if (isInSelectedRange) {
              markerClass += ' anomaly-marker ';
              markerClass += getSeverityWithLow(anomalyScore).id;
            }
          }
          return markerClass;
        });

      // Add rectangular markers for any scheduled events.
      const scheduledEventMarkers = lineChartGroup
        .select('.chart-markers')
        .selectAll('.scheduled-event-marker')
        .data(data.filter((d) => d.scheduledEvents !== undefined));

      // Remove markers that are no longer needed i.e. if number of chart points has decreased.
      scheduledEventMarkers.exit().remove();
      // Create any new markers that are needed i.e. if number of chart points has increased.
      scheduledEventMarkers
        .enter()
        .append('rect')
        .attr('width', LINE_CHART_ANOMALY_RADIUS * 2)
        .attr('height', SCHEDULED_EVENT_MARKER_HEIGHT)
        .attr('class', 'scheduled-event-marker')
        .attr('rx', 1)
        .attr('ry', 1);

      // Update all markers to new positions.
      scheduledEventMarkers
        .attr('x', (d) => lineChartXScale(d.date) - LINE_CHART_ANOMALY_RADIUS)
        .attr(
          'y',
          (d) => lineChartYScale(d[CHART_Y_ATTRIBUTE]) - SCHEDULED_EVENT_MARKER_HEIGHT / 2
        );
    }

    function showAnomalyPopover(marker, circle) {
      const anomalyTime = marker.date;

      const tableItem = getTableItemClosestToTimestamp(
        that.props.tableData.anomalies,
        anomalyTime,
        that.props.seriesConfig.entityFields
      );

      if (tableItem) {
        // Overwrite the timestamp of the possibly aggregated table item with the
        // timestamp of the anomaly clicked in the chart so we're able to pick
        // the right baseline and deviation time ranges for Log Rate Analysis.
        tableItem.source.timestamp = anomalyTime;

        // Calculate the relative coordinates of the clicked anomaly marker
        // so we're able to position the popover actions menu above it.
        const dotRect = circle.getBoundingClientRect();
        const rootRect = that.rootNode.getBoundingClientRect();
        const x = Math.round(dotRect.x + dotRect.width / 2 - rootRect.x);
        const y = Math.round(dotRect.y + dotRect.height / 2 - rootRect.y) - popoverMenuOffset;

        // Hide any active tooltip
        that.props.tooltipService.hide();
        // Set the popover state to enable the actions menu
        that.setState({ popoverData: tableItem, popoverCoords: [x, y] });
      }
    }

    function showLineChartTooltip(marker, circle) {
      // Show the time and metric values in the tooltip.
      // Uses date, value, upper, lower and anomalyScore (optional) marker properties.
      const formattedDate = formatHumanReadableDateTime(marker.date);
      const tooltipData = [{ label: formattedDate }];
      const seriesKey = config.detectorLabel;

      // Hide entity for scheduled events with mocked value.
      if (marker.entity !== undefined && marker.entity !== SCHEDULE_EVENT_MARKER_ENTITY) {
        tooltipData.push({
          label: i18n.translate('xpack.ml.explorer.distributionChart.entityLabel', {
            defaultMessage: 'entity',
          }),
          value: marker.entity,
          seriesIdentifier: {
            key: seriesKey,
          },
          valueAccessor: 'entity',
        });
      }

      if (marker.anomalyScore !== undefined) {
        const score = parseInt(marker.anomalyScore);
        const displayScore = getFormattedSeverityScore(score);
        tooltipData.push({
          label: i18n.translate('xpack.ml.explorer.distributionChart.anomalyScoreLabel', {
            defaultMessage: 'anomaly score',
          }),
          value: displayScore,
          color: getThemeResolvedSeverityColor(score, euiTheme),
          seriesIdentifier: {
            key: seriesKey,
          },
          valueAccessor: 'anomaly_score',
        });
        if (chartType !== CHART_TYPE.EVENT_DISTRIBUTION) {
          tooltipData.push({
            label: i18n.translate('xpack.ml.explorer.distributionChart.valueLabel', {
              defaultMessage: 'value',
            }),
            value: formatValue(marker.value, config.functionDescription, fieldFormat),
            seriesIdentifier: {
              key: seriesKey,
            },
            valueAccessor: 'value',
          });
          if (typeof marker.numberOfCauses === 'undefined' || marker.numberOfCauses === 1) {
            tooltipData.push({
              label: i18n.translate('xpack.ml.explorer.distributionChart.typicalLabel', {
                defaultMessage: 'typical',
              }),
              value: formatValue(marker.typical, config.functionDescription, fieldFormat),
              seriesIdentifier: {
                key: seriesKey,
              },
              valueAccessor: 'typical',
            });
          }
          if (typeof marker.byFieldName !== 'undefined' && marker.numberOfCauses !== undefined) {
            tooltipData.push({
              label: i18n.translate(
                'xpack.ml.explorer.distributionChart.unusualByFieldValuesLabel',
                {
                  defaultMessage:
                    '{ numberOfCauses, plural, one {# unusual {byFieldName} value} other {#{plusSign} unusual {byFieldName} values}}',
                  values: {
                    numberOfCauses: marker.numberOfCauses,
                    byFieldName: marker.byFieldName,
                    // Maximum of 10 causes are stored in the record, so '10' may mean more than 10.
                    plusSign: marker.numberOfCauses < 10 ? '' : '+',
                  },
                }
              ),
              seriesIdentifier: {
                key: seriesKey,
              },
              valueAccessor: 'numberOfCauses',
            });
          }
        }
      } else if (
        chartType !== CHART_TYPE.EVENT_DISTRIBUTION &&
        // Hide value for scheduled events with mocked value.
        marker.entity !== SCHEDULE_EVENT_MARKER_ENTITY
      ) {
        tooltipData.push({
          label: i18n.translate(
            'xpack.ml.explorer.distributionChart.valueWithoutAnomalyScoreLabel',
            {
              defaultMessage: 'value',
            }
          ),
          value: formatValue(marker.value, config.functionDescription, fieldFormat),
          seriesIdentifier: {
            key: seriesKey,
          },
          valueAccessor: 'value',
        });
      }

      if (marker.scheduledEvents !== undefined) {
        marker.scheduledEvents.forEach((scheduledEvent, i) => {
          tooltipData.push({
            label: i18n.translate(
              'xpack.ml.timeSeriesExplorer.timeSeriesChart.scheduledEventsLabel',
              {
                defaultMessage: 'scheduled event{counter}',
                values: { counter: marker.scheduledEvents.length > 1 ? ` #${i + 1}` : '' },
              }
            ),
            value: scheduledEvent,
            seriesIdentifier: {
              key: seriesKey,
            },
            valueAccessor: `scheduled_events_${i + 1}`,
          });
        });
      }

      tooltipService.show(tooltipData, circle, {
        x: LINE_CHART_ANOMALY_RADIUS * 3,
        y: LINE_CHART_ANOMALY_RADIUS * 2,
      });
    }
    this.chartScales = { lineChartXScale, margin };
  }

  shouldComponentUpdate() {
    // Always return true, d3 will take care of appropriate re-rendering.
    return true;
  }

  setRef(componentNode) {
    this.rootNode = componentNode;
  }

  closePopover() {
    this.setState({ popoverData: null, popoverCoords: [0, 0] });
  }

  setShowRuleEditorFlyoutFunction = (func) => {
    this.setState({
      showRuleEditorFlyout: func,
    });
  };

  unsetShowRuleEditorFlyoutFunction = () => {
    this.setState({
      showRuleEditorFlyout: () => {},
    });
  };

  render() {
    const { seriesConfig } = this.props;

    if (typeof seriesConfig === 'undefined') {
      // just return so the empty directive renders without an error later on
      return null;
    }

    // create a chart loading placeholder
    const isLoading = seriesConfig.loading;

    return (
      <>
        <RuleEditorFlyout
          setShowFunction={this.setShowRuleEditorFlyoutFunction}
          unsetShowFunction={this.unsetShowRuleEditorFlyoutFunction}
        />
        {this.state.popoverData !== null && (
          <div
            style={{
              position: 'absolute',
              marginLeft: this.state.popoverCoords[0],
              marginTop: this.state.popoverCoords[1],
            }}
          >
            <EuiPopover
              isOpen={true}
              closePopover={() => this.closePopover()}
              panelPaddingSize="none"
              anchorPosition="upLeft"
            >
              <LinksMenuUI
                anomaly={this.state.popoverData}
                bounds={{
                  min: moment(seriesConfig.plotEarliest),
                  max: moment(seriesConfig.plotLatest),
                }}
                showMapsLink={false}
                showViewSeriesLink={true}
                isAggregatedData={this.props.tableData.interval !== 'second'}
                interval={this.props.tableData.interval}
                showRuleEditorFlyout={this.state.showRuleEditorFlyout}
                onItemClick={() => this.closePopover()}
                sourceIndicesWithGeoFields={this.props.sourceIndicesWithGeoFields}
              />
            </EuiPopover>
          </div>
        )}
        <div css={cssMlExplorerChart} ref={this.setRef.bind(this)}>
          {isLoading && <LoadingIndicator height={CONTENT_WRAPPER_HEIGHT} />}
          {!isLoading && <div className="content-wrapper" />}
        </div>
      </>
    );
  }
}
