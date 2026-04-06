import { useMemo } from 'react';

import { Circle, Diamond, Search } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import useSessionStore from '@/store/useSessionStore';
import { valsStdDev, valsTruncatedMean } from '@/lib/utils';

import Panel from '@/components/ui/Panel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function DataCountRow({
  name,
  description,
  content,
}: {
  name: string;
  description?: string;
  content: string;
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <span title={description} className={`${description ? 'hover:cursor-help' : ''} text-sm`}>{name}</span>
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

function formatMsValue(ms: number | null): string {
  return ms === null ? '-' : `${Math.abs(ms).toFixed(1)} ms`;
}

function getErrorStats(errors: Array<number | null>) {
  const values = errors.filter((error): error is number => error !== null);
  const count = values.length;
  const total = errors.length;
  const average = count > 0 ? valsTruncatedMean(values.map((value) => Math.abs(value)), 0.25) : null;
  const worst = count > 0 ? Math.max(...values.map((value) => Math.abs(value))) : null;

  return { count, total, average, worst };
}

function SessionPanel({ onOpenReview }: { onOpenReview: () => void }) {
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
    breakdownStats,
    totalJudgedCount,
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
    const matchedAttackErrors = judgmentsWithStatus
      .map((entry) => entry.judgment)
      .filter((judgment) => judgment.playedIndex !== null)
      .map((judgment) => judgment.criteria.attack.error)
      .filter((error): error is number => error !== null);
    const totalReference = judged.length;
    const accuracy = totalReference > 0 ? (ok / totalReference) * 100 : 0;
    const badAttackErrors = judged
      .filter((entry) => entry.judgment.criteria.attack.pass === false)
      .map((entry) => entry.judgment.criteria.attack.error);
    const wrongPitchErrors = judged
      .filter((entry) => entry.judgment.criteria.pitch.pass === false)
      .map((entry) => entry.judgment.criteria.pitch.error);
    const inaccurateAttackErrors = judged
      .filter((entry) => entry.status === 'inaccurate' && entry.judgment.criteria.attack.pass === false)
      .map((entry) => entry.judgment.criteria.attack.error);
    const releaseErrors = judged
      .filter((entry) => entry.judgment.criteria.release.pass === false)
      .map((entry) => entry.judgment.criteria.release.error);
    const mutingErrors = judged
      .filter((entry) => entry.judgment.criteria.muting.pass === false)
      .map((entry) => entry.judgment.criteria.muting.error);
    const articulationErrors = judged
      .filter((entry) => entry.judgment.criteria.articulation.pass === false)
      .map((entry) => entry.judgment.criteria.articulation.error);
    const velocityErrors = judged
      .filter((entry) => entry.judgment.criteria.velocity.pass === false)
      .map((entry) => entry.judgment.criteria.velocity.error);

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
      breakdownStats: {
        attackMiss: getErrorStats(badAttackErrors),
        pitchMiss: getErrorStats(wrongPitchErrors),
        attackInaccurate: getErrorStats(inaccurateAttackErrors),
        release: getErrorStats(releaseErrors),
        muting: getErrorStats(mutingErrors),
        articulation: getErrorStats(articulationErrors),
        velocity: getErrorStats(velocityErrors),
      },
      totalJudgedCount: judged.length,
      rhythmBiasMs: valsTruncatedMean(matchedAttackErrors, 0.25),
      rhythmStdDevMs: valsStdDev(matchedAttackErrors),
      accuracyPercent: accuracy,
      recordingLengthMs: recordingLength,
    };
  }, [playedNotes, sessionAnalysis]);

  const formatBreakdownPercent = (count: number) => `${(totalJudgedCount > 0 ? (count / totalJudgedCount) * 100 : 0).toFixed(1)}%`;

  return (
    <Panel
      title="This Session"
      className="flex flex-col overflow-hidden pr-4"
      headerClassName="pr-0"
      contentClassName="flex-1 overflow-hidden"
      isScrollable
      buttonGroup={[
        (
          <Button key="session-review" onClick={onOpenReview}>
            <Search />
            Review
          </Button>
        ),
      ]}
    >
      {!hasRecording ? (
        <p className="p-2 pr-4 text-sm text-muted-foreground">
          No recording for this track yet. Record audio with the "
          <Circle className="inline-flex" stroke="red" size={12} />
          " button to see analysis results.
        </p>
      ) : (
        <div className="flex flex-col gap-4 select-text">
          {isAnalysisRunning ? (
            <h2 className="text-base font-medium animate-pulse">Analysis in Progress...</h2>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 select-none">
                <Card className="flex flex-row gap-2 px-4 py-2 justify-between items-center">
                  <Diamond size={14} className="stroke-note-ok fill-note-ok" />
                  <span>{okCount}×</span>
                </Card>
                <Card className="flex flex-row gap-2 px-4 py-2 justify-between items-center">
                  <Diamond size={14} className="stroke-note-inacc fill-note-inacc" />
                  <span>{inaccurateCount}×</span>
                </Card>
                <Card className="flex flex-row gap-2 px-4 py-2 justify-between items-center">
                  <Diamond size={14} className="stroke-note-miss fill-note-miss" />
                  <span>{missCount}×</span>
                </Card>
              </div>

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
                  <CardTitle>Error Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Tabs defaultValue="primary" className="w-full">
                    <TabsList variant="line" className="w-full">
                      <TabsTrigger value="primary" title="Critical Errors: instant [Miss]">Critical</TabsTrigger>
                      <TabsTrigger value="secondary" title="Secondary Errors: may cause [Inaccurate]">Secondary</TabsTrigger>
                      <TabsTrigger value="tertiary" title="Tertiary Errors: potential improvements">Minor</TabsTrigger>
                    </TabsList>
                    <TabsContent value="primary">
                      <Accordion type="multiple" className="w-full">
                        <AccordionItem value="attack-miss">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Attack"
                              description="Attack outside the acceptable window"
                              content={`${breakdownStats.attackMiss.count}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent className="space-y-1 pb-2">
                            <DataCountRow
                              name="Percent"
                              content={formatBreakdownPercent(breakdownStats.attackMiss.count)}
                            />
                            <DataCountRow
                              name="Average error"
                              content={formatMsValue(breakdownStats.attackMiss.average)}
                            />
                            <DataCountRow
                              name="Worst error"
                              content={formatMsValue(breakdownStats.attackMiss.worst)}
                            />
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="pitch-miss">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Wrong Pitch"
                              description="Note played with the wrong pitch"
                              content={`${breakdownStats.pitchMiss.count}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent className="space-y-1 pb-2">
                            <DataCountRow
                              name="Percent"
                              content={formatBreakdownPercent(breakdownStats.pitchMiss.count)}
                            />
                            <DataCountRow
                              name="Average error"
                              content={formatMsValue(breakdownStats.pitchMiss.average)}
                            />
                            <DataCountRow
                              name="Worst error"
                              content={formatMsValue(breakdownStats.pitchMiss.worst)}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                    <TabsContent value="secondary">
                      <Accordion type="multiple" className="w-full">
                        <AccordionItem value="inaccurate-attack">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Inaccurate Attack"
                              description="Note attack timing that is off but still within a reasonable window"
                              content={`${breakdownStats.attackInaccurate.count}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent className="space-y-1 pb-2">
                            <DataCountRow
                              name="Percent"
                              content={formatBreakdownPercent(breakdownStats.attackInaccurate.count)}
                            />
                            <DataCountRow
                              name="Average error"
                              content={formatMsValue(breakdownStats.attackInaccurate.average)}
                            />
                            <DataCountRow
                              name="Worst error"
                              content={formatMsValue(breakdownStats.attackInaccurate.worst)}
                            />
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="release-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Release"
                              description="Inaccurate note release timing"
                              content={`${breakdownStats.release.count}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent className="space-y-1 pb-2">
                            <DataCountRow
                              name="Percent"
                              content={formatBreakdownPercent(breakdownStats.release.count)}
                            />
                            <DataCountRow
                              name="Average error"
                              content={formatMsValue(breakdownStats.release.average)}
                            />
                            <DataCountRow
                              name="Worst error"
                              content={formatMsValue(breakdownStats.release.worst)}
                            />
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="muting-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Muting"
                              description="Failure to mute properly with audible unintentionally ringing notes"
                              content={`${breakdownStats.muting.count}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent className="space-y-1 pb-2">
                            <DataCountRow
                              name="Percent"
                              content={formatBreakdownPercent(breakdownStats.muting.count)}
                            />
                            <DataCountRow
                              name="Average error"
                              content={formatMsValue(breakdownStats.muting.average)}
                            />
                            <DataCountRow
                              name="Worst error"
                              content={formatMsValue(breakdownStats.muting.worst)}
                            />
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="articulation-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Bad Articulation"
                              description="Outlier waveform compared to the rest of the song"
                              content={`${breakdownStats.articulation.count}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent className="space-y-1 pb-2">
                            <DataCountRow
                              name="Percent"
                              content={formatBreakdownPercent(breakdownStats.articulation.count)}
                            />
                            <DataCountRow
                              name="Average error"
                              content={formatMsValue(breakdownStats.articulation.average)}
                            />
                            <DataCountRow
                              name="Worst error"
                              content={formatMsValue(breakdownStats.articulation.worst)}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                    <TabsContent value="tertiary">
                      <Accordion type="multiple" className="w-full">
                        <AccordionItem value="velocity-fail">
                          <AccordionTrigger>
                            <DataCountRow
                              name="Inconsistent Velocity"
                              description="Outlier velocity (either too loud or too quiet) compared to the rest of the song"
                              content={`${breakdownStats.velocity.count}×`}
                            />
                          </AccordionTrigger>
                          <AccordionContent className="space-y-1 pb-2">
                            <DataCountRow
                              name="Percent"
                              content={formatBreakdownPercent(breakdownStats.velocity.count)}
                            />
                            <DataCountRow
                              name="Average error"
                              content={formatMsValue(breakdownStats.velocity.average)}
                            />
                            <DataCountRow
                              name="Worst error"
                              content={formatMsValue(breakdownStats.velocity.worst)}
                            />
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
