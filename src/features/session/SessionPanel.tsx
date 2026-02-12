import { useLibraryStore } from "@/store/useLibraryStore";

import Panel from "@/components/ui/Panel";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Square } from "lucide-react";

const DataCountRow = ({
  name,
  description,
  content,
}: {
  name: string;
  description: string;
  content: string;
}) => {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <span title={description} className="hover:cursor-help text-sm">{name}</span>
      <span className="text-sm">{content}</span>
    </div>
  );
}

const SessionPanel = () => {
  return (
    <Panel
      title="This Session"
      isCollapsible
      className="border-b"
    >
      <div className="flex flex-col gap-4 p-2">
        <div className="w-full flex flex-col gap-2">
          <DataCountRow name="Recording Length" description="asdfa" content="0:00.000" />
          <DataCountRow name="Accuracy" description="asdfa" content="90.2%" />
          <DataCountRow name="Rhythm Instability (std. dev)" description="asdfa" content="11.1 ms" />
        </div>
        <Card className="flex flex-col gap-2 px-4 py-2">
          <Accordion
            type="multiple"
            className="max-w-lg"
            defaultValue={["OK", "Inaccurate", "Miss"]}
          >
            <AccordionItem value="OK">
              <AccordionTrigger className="flex flex-row items-center justify-between gap-4">
                <div className="w-full flex flex-row items-center gap-2">
                  <Square className="text-green-500" size={12} />
                  <p>OK</p>
                </div>
                <p className="text-green-500">123×</p>
              </AccordionTrigger>
              <AccordionContent>OK</AccordionContent>
            </AccordionItem>
            <AccordionItem value="Inaccurate">
              <AccordionTrigger className="flex flex-row items-center justify-between gap-4">
                <div className="w-full flex flex-row items-center gap-2">
                  <Square className="text-yellow-500" size={12} />
                  <p>Inaccurate</p>
                </div>
                <p className="text-yellow-500">44×</p>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2 h-fit">
                <DataCountRow name="Bad Attack" description="asdfa" content="20×" />
                <DataCountRow name="Bad Duration" description="asdfa" content="20×" />
                <DataCountRow name="Wrong Pitch" description="asdfa" content="20×" />
                <DataCountRow name="Inconsistent Velocity" description="asdfa" content="20×" />
                <DataCountRow name="Bad Muting" description="asdfa" content="20×" />
                <DataCountRow name="Bad Articulation" description="asdfa" content="20×" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="Miss">
              <AccordionTrigger className="flex flex-row items-center justify-between gap-4">
                <div className="w-full flex flex-row items-center gap-2">
                  <Square className="text-red-500" size={12} />
                  <p>Miss</p>
                </div>
                <p className="text-red-500">0×</p>
              </AccordionTrigger>
              <AccordionContent>Miss</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>
    </Panel>
  );
};

export default SessionPanel;
