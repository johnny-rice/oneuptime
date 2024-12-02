import React, { FunctionComponent, ReactElement, useEffect } from "react";
import DashboardChartComponent from "Common/Types/Dashboard/DashboardComponents/DashboardChartComponent";
import { DashboardBaseComponentProps } from "./DashboardBaseComponent";
import MetricCharts from "../../Metrics/MetricCharts";
import AggregatedResult from "Common/Types/BaseDatabase/AggregatedResult";
import { DashboardStartAndEndDateUtil } from "../Types/DashboardStartAndEndDate";
import PageLoader from "Common/UI/Components/Loader/PageLoader";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import { PromiseVoidFunction } from "Common/Types/FunctionTypes";
import MetricViewData from "../../Metrics/Types/MetricViewData";
import MetricUtil from "../../Metrics/Utils/Metrics";
import API from "Common/UI/Utils/API/API";

export interface ComponentProps extends DashboardBaseComponentProps {
  component: DashboardChartComponent;
}

const DashboardChartComponentElement: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const [metricResults, setMetricResults] = React.useState<
    Array<AggregatedResult>
  >([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const metricViewData: MetricViewData = {
    queryConfigs: props.component.arguments.metricQueryConfig
      ? [props.component.arguments.metricQueryConfig]
      : [],
    startAndEndDate: DashboardStartAndEndDateUtil.getStartAndEndDate(
      props.dashboardStartAndEndDate,
    ),
    formulaConfigs: [],
  };

  const fetchAggregatedResults: PromiseVoidFunction =
    async (): Promise<void> => {
      setIsLoading(true);

      if (
        !metricViewData.startAndEndDate?.startValue ||
        !metricViewData.startAndEndDate?.endValue
      ) {
        setIsLoading(false);
        setError("Please select a valid start and end date.");
      }

      if(!metricViewData.queryConfigs || metricViewData.queryConfigs.length === 0 || !metricViewData.queryConfigs[0] || !metricViewData.queryConfigs[0].metricQueryData || !metricViewData.queryConfigs[0].metricQueryData.filterData || Object.keys(metricViewData.queryConfigs[0].metricQueryData.filterData).length === 0) {
        setIsLoading(false);
        setError("Please select a metric. Click here to add a metric.");
      }

      if(!metricViewData.queryConfigs[0] || !metricViewData.queryConfigs[0].metricQueryData.groupBy || Object.keys(metricViewData.queryConfigs[0].metricQueryData.groupBy).length === 0) {
        setIsLoading(false);
        setError("Please select a aggregation. Click here to add a aggregation.");
      }

      try {
        const results: Array<AggregatedResult> = await MetricUtil.fetchResults({
          metricViewData: metricViewData,
        });

        setMetricResults(results);
        setError("");
      } catch (err: unknown) {
        setError(API.getFriendlyErrorMessage(err as Error));
      }

      setIsLoading(false);
    };


  useEffect(() => {
    fetchAggregatedResults();
  }, [
    props.dashboardStartAndEndDate,
    props.component.arguments.metricQueryConfig,
    props.metricNameAndUnits,
  ]);


  useEffect(() => {
    fetchAggregatedResults();
  }, [
  
  ]);


  if (isLoading) {
    return <PageLoader isVisible={true} />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div>
      <MetricCharts
        metricResults={metricResults}
        metricNamesAndUnits={props.metricNameAndUnits}
        metricViewData={metricViewData}
      />
    </div>
  );
};

export default DashboardChartComponentElement;
