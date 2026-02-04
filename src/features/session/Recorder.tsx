import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const Recorder = () => {
  return (
    <section className="h-min border-t p-6">
      <ScrollArea>
        <ScrollBar orientation="horizontal" />
        <div className="flex flex-col gap-1">
          <div className="w-full h-10 bg-secondary rounded-md">
            Reference Waveform
          </div>
          <div className="w-full h-20 bg-secondary rounded-md">
            Recorded Waveform
          </div>
        </div>
      </ScrollArea>
    </section>
  )
};

export default Recorder;
