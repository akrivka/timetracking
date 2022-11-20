import { useRouteData } from "solid-app-router";
import { Component, Match, Resource, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import Report from "../components/ReportComp";
import { WrappedInfo } from "../context/UserContext";
import { renderTimeFull } from "../lib/format";

// duplicating here not ideal!
type ReportExport = {
  labelTimeMap: Map<Label, number>;
  totalDuration: number;
  startDate: Date;
  endDate: Date;
};

const PublicReport: Component<ReportExport> = (props) => {
  const labelInfoMap = new Map<string, WrappedInfo>();

  for (const label of [...props.labelTimeMap.keys()]) {
    const [labelInfo, setLabelInfo] = createStore({ expanded: true });
    labelInfoMap.set(label, [labelInfo, (info) => setLabelInfo(info)]);
  }

  const getLabelInfo = (label: string) => labelInfoMap.get(label);

  return (
    <div class="pl-8 pt-4 h-screen overflow-auto">
      <div class="text-xs text-gray-700">
        {`${renderTimeFull(props.startDate)} – ${renderTimeFull(
          props.endDate
        )}`}
      </div>
      <div class="h-2" />
      <Report
        labelTimeMap={props.labelTimeMap}
        totalDuration={props.totalDuration}
        getLabelInfo={getLabelInfo}
      />
    </div>
  );
};

const PublicReportPage: Component = () => {
  const report = useRouteData<Resource<Resource<ReportExport | string>>>();

  return (
    <Switch>
      <Match when={report.loading}>Loading...</Match>
      <Match when={!report() || report() === "not found"}>Not found.</Match>
      <Match when={true}>
        <PublicReport {...(report() as ReportExport)} />
      </Match>
    </Switch>
  );
};

export default PublicReportPage;
