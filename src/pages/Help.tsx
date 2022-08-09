/* @refresh reload */
import { Component, For, JSXElement } from "solid-js";

const MySection = (props) => {
  return (
    <div>
      <div class="font-semibold">{props.title}</div>
      <div class="pl-4 space-y-1">{props.children}</div>
    </div>
  );
};

const MyHeading = (props) => {
  return <div class="font-bold">{props.children}</div>;
};

type Keybind = {
  keybind: string;
  description: string;
};

const MySubSection = (props) => {
  return (
    <div class="space-y-1">
      <div class="text-sm">{props.title}</div>
      <div class="pl-4">{props.children}</div>
    </div>
  );
};

const MyKeybinds: Component<{ keybinds: Keybind[] }> = (props) => {
  return (
    <MySubSection title="Keybinds">
      <div class="text-xs pl-2 space-y-0.5">
        <For each={props.keybinds}>
          {(keybind) => (
            <MyKeybind
              keybind={keybind.keybind}
              description={keybind.description}
            />
          )}
        </For>
      </div>
    </MySubSection>
  );
};

type Syntax = {
  text: JSXElement;
  description?: JSXElement;
};

const MySyntax: Component<{ syntax: Syntax[] }> = (props) => {
  return (
    <ul class="text-xs pl-2 space-y-0.5 list-disc">
      <For each={props.syntax}>
        {(syn) => (
          <li>
            <div class="flex">
              <div class="w-40">{syn.text}</div>
              <div>{syn.description}</div>
            </div>
          </li>
        )}
      </For>
    </ul>
  );
};

const MyKeybind = (props) => {
  return (
    <div class="flex space-x-2">
      <div class="w-32 border rounded text-center text-gray-500">
        {props.keybind}
      </div>
      <div>{props.description}</div>
    </div>
  );
};

const trackKeybinds = [
  {
    keybind: "Cmd/Ctrl+Enter",
    description: "Focus first entry input box",
  },
  {
    keybind: "Enter",
    description:
      "Focus input box if shown but not focused (shouldn't happen often)",
  },
  {
    keybind: "Escape",
    description: "Close input box/search",
  },
  {
    keybind: "Up",
    description: "When input box is focused, move it up",
  },
  {
    keybind: "Down",
    description: "When input box is focused, move it down",
  },
  {
    keybind: "Cmd/Ctrl+f",
    description: "Open/focus search input box",
  },
  {
    keybind: "Cmd/Ctrl+n",
    description: "When search in progress, go to next result",
  },
  {
    keybind: "Cmd/Ctrl+p",
    description: "When search in progress, go to previous result",
  },
];

const generalKeybinds = [
  {
    keybind: "Option/Alt+{`,1,2,3,4}",
    description: "Switch to tab {Home, Track, Report, Calendar, Help}",
  },
  {
    keybind: "Cmd/Ctrl+z",
    description:
      "Undo last action (only works with entries, not colors or expand state)",
  },
  {
    keybind: "Cmd/Ctrl+Shift+z",
    description: "Redo last action (ditto)",
  },
];

const reportKeybinds = [
  {
    keybind: "Left",
    description: "Shift date range back by one increment (day, week, month)",
  },
  {
    keybind: "Right",
    description: "Shift date range forward by one increment (day, week, month)",
  },
];

const calendarKeybinds = [
  {
    keybind: "Left",
    description: "Move one week back",
  },
  {
    keybind: "Right",
    description: "Move one week forward",
  },
];

const Token = (props) => {
  return <span class="text-gray-500">[{props.children}]</span>;
};

const Entry = (props) => {
  return <span class="text-gray-500 italic">{props.children}</span>;
};

const trackSyntax = [
  {
    text: (
      <>
        <Token>label</Token>
      </>
    ),
    description: (
      <>
        Relabel <Entry>start</Entry>/<Entry>end</Entry> OR add new entry with
        current time and before <Token>label</Token>
      </>
    ),
  },
  {
    text: (
      <>
        now <Token>label</Token>
      </>
    ),
    description: (
      <>
        Relabel pending entry with <Token>label</Token> (works only in top/first
        input box)
      </>
    ),
  },
  {
    text: <>continue / c</>,
    description: (
      <>
        Extend entry before <Entry>start</Entry> into current one
      </>
    ),
  },
  {
    text: (
      <>
        continue first <Token>duration</Token>
      </>
    ),
    description: (
      <>
        Extend entry before <Entry>start</Entry> <Token>duration</Token> into
        current one
      </>
    ),
  },
  {
    text: <>reverse continue / rev continue / rc</>,
    description: (
      <>
        Extend current entry into the one before <Entry>start</Entry>{" "}
      </>
    ),
  },
  {
    text: (
      <>
        first <Token>duration</Token> <Token>label</Token>{" "}
      </>
    ),
    description: (
      <>
        Add new entry with time <Token>duration</Token> after{" "}
        <Entry>start</Entry> and <Token>label</Token>
      </>
    ),
  },
  {
    text: (
      <>
        last <Token>duration</Token> <Token>label</Token>{" "}
      </>
    ),
    description: (
      <>
        Add new entry with time <Token>duration</Token> before{" "}
        <Entry>end</Entry>/now and <Token>label</Token> (in case of top/first
        input box creates two entries)
      </>
    ),
  },
  {
    text: (
      <>
        until <Token>duration</Token> ago <Token>label</Token>
      </>
    ),
    description: (
      <>
        Add entry with time <Token>duration</Token> before <Entry>end</Entry>
        /now and <Token>label</Token>
      </>
    ),
  },
  {
    text: (
      <>
        after first <Token>duration</Token> <Token>label</Token>
      </>
    ),
    description: (
      <>
        Add entry with time <Token>duration</Token> after <Entry>start</Entry>{" "}
        with after <Token>label</Token>
      </>
    ),
  },
  {
    text: (
      <>
        until <Token>time</Token> <Token>label</Token>{" "}
      </>
    ),
    description: (
      <>
        Add entry with <Token>time</Token> and before <Token>label</Token>{" "}
      </>
    ),
  },
  {
    text: (
      <>
        after <Token>time</Token> <Token>label</Token>
      </>
    ),
    description: (
      <>
        Add entry with <Token>time</Token> and after <Token>label</Token>
      </>
    ),
  },
];

const reportSyntax = [
  {
    text: (
      <>
        <Token>date</Token> to/until <Token>date</Token>
      </>
    ),
  },
  {
    text: (
      <>
        <Token>date</Token> (e.g. Jan 1)
      </>
    ),
    description: <>From the start of that day to the end of that day</>,
  },
  {
    text: (
      <>
        <Token>month</Token> (e.g. Jan 1)
      </>
    ),
    description: (
      <>
        From the start of that <Token>month</Token> to the end of that{" "}
        <Token>month</Token>
      </>
    ),
  },
  {
    text: <>today</>,
  },
  {
    text: <>yesterday</>,
  },
  {
    text: <>this week</>,
  },
  {
    text: <>last week</>,
  },
  {
    text: <>this month</>,
  },
  {
    text: <>last month</>,
  },
  {
    text: <>this year</>,
  },
  {
    text: <>last year</>,
  },
];

const Help = () => {
  return (
    <div class="pl-8 pt-4 space-y-3 h-screen overflow-auto">
      <div class="text-lg">Help</div>
      <MySection title="General">
        <MyKeybinds keybinds={generalKeybinds} />
      </MySection>
      <MySection title="Track">
        <MyKeybinds keybinds={trackKeybinds} />
        <MySubSection title="Input box commands">
          <div class="text-xs">
            (<Entry>start</Entry>/<Entry>end</Entry> represent the entries
            before and after the current position of the input box.)
          </div>
          <div class="h-2" />
          <MySyntax syntax={trackSyntax} />
        </MySubSection>
      </MySection>
      <MySection title="Report">
        <MyKeybinds keybinds={reportKeybinds} />
        <MySubSection title="Date range syntax">
          <MySyntax syntax={reportSyntax} />
        </MySubSection>
      </MySection>
      <MySection title="Calendar">
        <MyKeybinds keybinds={calendarKeybinds} />
      </MySection>
      <div class="h-96"></div>
    </div>
  );
};

export default Help;
