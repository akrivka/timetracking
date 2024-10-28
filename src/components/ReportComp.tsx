import {
  Component,
  createContext,
  createMemo,
  For,
  Show,
  useContext,
} from "solid-js";
import { MS_IN_DAYS, MS_IN_WEEKS } from "../lib/constants";
import { renderDuration, renderPercentage } from "../lib/format";
import { getLabelImmediateChildren, leafLabel } from "../lib/labels";
import { Label } from "../lib/entries";

export type ShowType = "total" | "weekly" | "daily" | "percent";

type ReportProps = {
  labelTimeMap: Map<Label, number>;
  totalDuration: number;
  showType?: ShowType;
  showColors?: boolean;
  getLabelInfo?: (label: Label) => any;
  oncontextmenu?: (e: MouseEvent, label: Label) => void;
};

function renderReportDuration(time: number, total: number, display: ShowType) {
  switch (display) {
    case "total":
      return renderDuration(time);
    case "daily":
      return `${renderDuration((time * MS_IN_DAYS) / total)}/d`;
    case "weekly":
      return `${renderDuration((time * MS_IN_WEEKS) / total)}/w`;
    case "percent":
      return renderPercentage(time / total);
  }
}

const StaticBlock: Component<{ label: string; duration: number }> = (props) => {
  return (
    <>
      [{renderDuration(props.duration)}] {props.label}
    </>
  );
};

const Block: Component<{
  prelabel?: Label;
  label: Label;
}> = (props) => {
  const report = useReport();
  const { getLabelInfo, oncontextmenu } = report;

  const fullLabel = () =>
    (props.prelabel ? props.prelabel + "/" : "") + props.label;

  const [info, setInfo] = getLabelInfo(fullLabel()) || [{ expanded: true }];

  const childrenLabels = createMemo(() =>
    getLabelImmediateChildren(fullLabel(), [...report.labelTimeMap.keys()])
  );

  const isLeaf = createMemo(() => childrenLabels().length === 0);

  const uncategorizedTime = createMemo(() => {
    return (
      report.labelTimeMap.get(props.label) -
      childrenLabels().reduce(
        (acc, label) => acc + report.labelTimeMap.get(label),
        0
      )
    );
  });

  return (
    <Show
      when={
        childrenLabels().length !== 1 ||
        (childrenLabels().length === 1 &&
          report.labelTimeMap.get(childrenLabels()[0]) !==
            report.labelTimeMap.get(fullLabel()))
      }
      fallback={() => (
        <Block
          prelabel={props.prelabel}
          label={props.label + "/" + leafLabel(childrenLabels()[0])}
        />
      )}
    >
      <div
        class={
          "flex items-center space-x-1 h-6 " +
          (!isLeaf() ? "cursor-pointer" : "")
        }
        onclick={() => setInfo && setInfo({ expanded: !info.expanded })}
        oncontextmenu={(e) => oncontextmenu && oncontextmenu(e, fullLabel())}
      >
        <Show when={report.showColors}>
          <div class="w-1 h-5" style={{ "background-color": info.color }} />
        </Show>
        <span>
          [
          {renderReportDuration(
            report.labelTimeMap.get(fullLabel()),
            report.totalDuration,
            report.showType || "total"
          )}
          ]
        </span>
        <span>
          {props.label} {!isLeaf() ? "[+]" : ""}
        </span>
      </div>
      <Show when={info?.expanded}>
        <div class="pl-8">
          <Show when={uncategorizedTime() > 0 && !isLeaf()}>
            <StaticBlock
              label={"uncategorized"}
              duration={uncategorizedTime()}
            />
          </Show>
          <For each={childrenLabels()}>
            {(label) => (
              <Block prelabel={fullLabel()} label={leafLabel(label)} />
            )}
          </For>
        </div>
      </Show>
    </Show>
  );
};

const ReportContext = createContext<ReportProps>();
const useReport = () => useContext(ReportContext);

const Report: Component<ReportProps> = (props) => {
  const topLabels = createMemo(() =>
    getLabelImmediateChildren(null, [...props.labelTimeMap.keys()])
  );

  const uncategorizedTime = createMemo(() => {
    return (
      props.totalDuration -
      topLabels().reduce((acc, label) => acc + props.labelTimeMap.get(label), 0)
    );
  });

  return (
    <div class="select-none">
      <StaticBlock label="total" duration={props.totalDuration} />
      <ReportContext.Provider value={props}>
        <div class="pl-8">
          <Show when={uncategorizedTime() > 0}>
            <StaticBlock
              label={"uncategorized"}
              duration={uncategorizedTime()}
            />
          </Show>
          <For each={topLabels()}>{(label) => <Block label={label} />}</For>
        </div>
      </ReportContext.Provider>
    </div>
  );
};

export default Report;
