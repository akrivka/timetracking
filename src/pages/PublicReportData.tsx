import axios from "axios";
import { createResource } from "solid-js";
//import { deserializeReportExport } from "../Report";
// DUPLICATING FOR NOW NOT IDEAL!
function deserializeReportExport(json: string) {
  const { labelTimeMap, startDate, totalDuration, endDate } = JSON.parse(json);
  return {
    labelTimeMap: new Map(labelTimeMap),
    totalDuration: totalDuration,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  };
}

const PublicReportData = ({ params }) => {
  const [report] = createResource(
    () => params.id,
    async (id) =>
      deserializeReportExport(
        (await axios.get("/api/report", { params: { id } })).data
      )
  );

  return report;
};

export default PublicReportData;
