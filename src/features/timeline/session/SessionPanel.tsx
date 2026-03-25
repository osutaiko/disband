import { useMemo } from 'react';

import { Circle } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import useSessionStore from '@/store/useSessionStore';
import { valsStdDev, valsTruncatedMean } from '@/lib/utils';

import Panel from '@/components/ui/Panel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function DataCountRow({
  name,
  description,
  content,
}: {
  name: string;
  description: string;
  content: string;
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <span title={description} className="hover:cursor-help text-sm">{name}</span>
      <span className="text-sm">{content}</span>
    </div>
  );
}

function formatDurationMs(durationMs: number): string {
  const safeMs = Math.max(0, Math.round(durationMs));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = safeMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function SessionPanel() {
  const { selectedSong, selectedTrackId } = useLibraryStore();
  const { recordedPaths, sessionAnalysisBySelection, analysisInProgressBySelection } = useSessionStore();

  const selectionId = selectedTrackId === null
    ? null
    : `${selectedSong ?? 'no-song'}::${selectedTrackId}`;
  const hasRecording = selectionId ? Boolean(recordedPaths[selectionId]) : false;
  const isAnalysisRunning = selectionId ? Boolean(analysisInProgressBySelection[selectionId]) : false;
  const sessionAnalysis = selectionId ? (sessionAnalysisBySelection[selectionId] ?? null) : null;
  const playedNotes = sessionAnalysis?.playedNotes ?? [];

  const {
    okCount,
    inaccurateCount,
    missCount,
    criteriaFailCounts,
    rhythmBiasMs,
    rhythmStdDevMs,
    accuracyPercent,
    recordingLengthMs,
  } = useMemo(() => {
    const recordingLength = playedNotes.reduce((max, note) => Math.max(max, note.endMs), 0);
    const judgmentsWithStatus = (sessionAnalysis?.referenceJudgments ?? []).map((judgment) => ({
      judgment,
      status: judgment.kind ?? 'unjudged',
    }));
    const judged = judgmentsWithStatus.filter((entry) => entry.status !== 'unjudged');

    const ok = judged.filter((entry) => entry.status === 'ok').length;
    const inaccurate = judged.filter((entry) => entry.status === 'inaccurate').length;
    const miss = judged.filter((entry) => entry.status === 'miss').length;
    const attackInaccurate = judged.filter((entry) => entry.status === 'inaccurate' && entry.judgment.criteria.attack.pass === false).length;
    const attackMiss = judged.filter((entry) => entry.status === 'miss' && entry.judgment.criteria.attack.pass === false).length;
    const pitchMiss = judged.filter((entry) => entry.status === 'miss' && entry.judgment.criteria.pitch.pass === false).length;
    const releaseFail = judged.filter((entry) => entry.judgment.criteria.release.pass === false).length;
    const mutingFail = judged.filter((entry) => entry.judgment.criteria.muting.pass === false).length;
    const articulationFail = judged.filter((entry) => entry.judgment.criteria.articulation.pass === false).length;
    const velocityFail = judged.filter((entry) => entry.judgment.criteria.velocity.pass === false).length;
    const skippedNotes = judged.filter((entry) => entry.status === 'miss' && entry.judgment.playedIndex === null).length;
    const matchedAttackErrors = judgmentsWithStatus
      .map((entry) => entry.judgment)
      .filter((judgment) => judgment.playedIndex !== null)
      .map((judgment) => judgment.criteria.attack.error)
      .filter((error): error is number => error !== null);
    const totalReference = judged.length;
    const accuracy = totalReference > 0 ? (ok / totalReference) * 100 : 0;

    return {
      okCount: ok,
      inaccurateCount: inaccurate,
      missCount: miss,
      criteriaFailCounts: {
        attack: {
          inaccurate: attackInaccurate,
          miss: attackMiss,
        },
        pitch: {
          miss: pitchMiss,
        },
        release: releaseFail,
        muting: mutingFail,
        articulation: articulationFail,
        velocity: velocityFail,
      },
      skippedNotesCount: skippedNotes,
      rhythmBiasMs: valsTruncatedMean(matchedAttackErrors, 0.25),
      rhythmStdDevMs: valsStdDev(matchedAttackErrors),
      accuracyPercent: accuracy,
      recordingLengthMs: recordingLength,
    };
  }, [playedNotes, sessionAnalysis]);

  return (
    <Panel
      title="This Session"
      className="flex flex-col overflow-hidden pr-4"
      contentClassName="flex-1 overflow-hidden"
      isScrollable
    >
      {!hasRecording ? (
        <p className="p-2 pr-4 text-sm text-muted-foreground">
          No recording for this track yet. Record audio with the "
          <Circle className="inline-flex" stroke="red" size={12} />
          " button to see analysis results.
        </p>
      ) : (
        <div className="flex flex-col gap-4 pr-4 select-text">
          {isAnalysisRunning ? (
            <h2 className="text-base font-medium animate-pulse">Analysis in Progress...</h2>
          ) : (
            <>
              <div className="w-full flex flex-col px-2 gap-2">
                <DataCountRow
                  name="Recording Length"
                  description="Total recording duration"
                  content={formatDurationMs(recordingLengthMs)}
                />
                <DataCountRow
                  name="Accuracy"
                  description="OK notes / total reference notes"
                  content={`${accuracyPercent.toFixed(1)}%`}
                />
                <DataCountRow
                  name="Timing Bias"
                  description="Overall rushing/dragging tendency"
                  content={`${Math.abs(rhythmBiasMs).toFixed(2)} ms ${rhythmBiasMs > 0 ? 'dragging' : 'rushing'}`}
                />
                <DataCountRow
                  name="Rhythm Instability (std. dev)"
                  description="Standard deviation of note attack error"
                  content={`${rhythmStdDevMs.toFixed(1)} ms`}
                />
              </div>

              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Session Status</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Tabs defaultValue="ok" className="w-full">
                    <TabsList variant="line" className="w-full">
                      <TabsTrigger title="OK" value="ok">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex h-3 w-3 rounded-[3px] bg-note-ok" />
                          <span className="text-sm">{`${okCount}×`}</span>
                        </span>
                      </TabsTrigger>
                      <TabsTrigger title="Inaccurate" value="inaccurate">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex h-3 w-3 rounded-[3px] bg-note-inacc" />
                          <span className="text-sm">{`${inaccurateCount}×`}</span>
                        </span>
                      </TabsTrigger>
                      <TabsTrigger title="Miss" value="miss">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex h-3 w-3 rounded-[3px] bg-note-miss" />
                          <span className="text-sm">{`${missCount}×`}</span>
                        </span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="ok">
                      <span className="text-note-ok">OK</span> notes:
                      <div>TODO</div>
                    </TabsContent>
                    <TabsContent value="inaccurate">
                      <span className="text-note-inacc">Inaccurate</span> notes:
                      {' '}
                      <div>TODO</div>
                    </TabsContent>
                    <TabsContent value="miss">
                      <span className="text-note-miss">Missed</span> notes:
                      {' '}
                      <div>TODO</div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Tabs defaultValue="primary" className="w-full">
                    <TabsList variant="line" className="w-full">
                      <TabsTrigger value="primary">Critical</TabsTrigger>
                      <TabsTrigger value="secondary">Secondary</TabsTrigger>
                      <TabsTrigger value="tertiary">Minor</TabsTrigger>
                    </TabsList>
                    <TabsContent value="primary">
                      <Accordion type="single" className="w-full">
                        <AccordionItem value="attack-miss">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Attack"
                              description="Attack outside the acceptable window"
                              content={`${criteriaFailCounts.attack.miss}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent>
                            <div>TODO</div>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="pitch-miss">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Wrong Pitch"
                              description="Note played with the wrong pitch"
                              content={`${criteriaFailCounts.pitch.miss}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent>
                            <div>TODO</div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                    <TabsContent value="secondary">
                      <Accordion type="single" className="w-full">
                        <AccordionItem value="inaccurate-attack">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Inaccurate Attack"
                              description="Note attack timing that is off but still within a reasonable window"
                              content={`${criteriaFailCounts.attack.inaccurate}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent>
                            <div>TODO</div>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="release-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Release"
                              description="Inaccurate note release timing"
                              content={`${criteriaFailCounts.release}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent>
                            <div>TODO</div>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="muting-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Muting"
                              description="Failure to mute properly with audible unintentionally ringing notes"
                              content={`${criteriaFailCounts.muting}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent>
                            <div>TODO</div>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="articulation-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Articulation"
                              description="Outlier waveform compared to the rest of the song"
                              content={`${criteriaFailCounts.articulation}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent>
                            <div>TODO</div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                    <TabsContent value="tertiary">
                      <Accordion type="single" className="w-full">
                        <AccordionItem value="velocity-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Inconsistent Velocity"
                              description="Outlier velocity (either too loud or too quiet) compared to the rest of the song"
                              content={`${criteriaFailCounts.velocity}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent>
                            <div>TODO</div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

export default SessionPanel;
