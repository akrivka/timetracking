import axios from "axios";
import { createResource } from "solid-js";
import { deserializeReportExport } from "./Report";

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
