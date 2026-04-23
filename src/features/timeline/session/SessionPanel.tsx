import { useMemo } from 'react';

import { Circle, Diamond, Search } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import useSessionStore from '@/store/useSessionStore';
import { formatMs, formatNumber, valsStdDev, valsTruncatedMean } from '@/lib/utils';

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
    const noteJudgmentsWithKind = (sessionAnalysis?.noteJudgments ?? []).map((noteJudgment) => ({
      noteJudgment,
      kind: noteJudgment.kind ?? 'unjudged',
    }));
    const judged = noteJudgmentsWithKind.filter((entry) => entry.kind !== 'unjudged');

    const ok = judged.filter((entry) => entry.kind === 'ok').length;
    const inaccurate = judged.filter((entry) => entry.kind === 'inaccurate').length;
    const miss = judged.filter((entry) => entry.kind === 'miss').length;
    const attackInaccurate = judged.filter((entry) => entry.kind === 'inaccurate' && entry.noteJudgment.criteria.attack.pass === false).length;
    const attackMiss = judged.filter((entry) => entry.kind === 'miss' && entry.noteJudgment.criteria.attack.pass === false).length;
    const pitchMiss = judged.filter((entry) => entry.kind === 'miss' && entry.noteJudgment.criteria.pitch.pass === false).length;
    const releaseFail = judged.filter((entry) => entry.noteJudgment.criteria.release.pass === false).length;
    const mutingFail = judged.filter((entry) => entry.noteJudgment.criteria.muting.pass === false).length;
    const articulationFail = judged.filter((entry) => entry.noteJudgment.criteria.articulation.pass === false).length;
    const velocityFail = judged.filter((entry) => entry.noteJudgment.criteria.velocity.pass === false).length;
    const matchedAttackErrors = noteJudgmentsWithKind
      .map((entry) => entry.noteJudgment)
      .filter((noteJudgment) => noteJudgment.playedIndex !== null)
      .map((noteJudgment) => noteJudgment.criteria.attack.error)
      .filter((error): error is number => error !== null);
    const totalReference = judged.length;
    const accuracy = totalReference > 0 ? (ok / totalReference) * 100 : 0;
    const badAttackErrors = judged
      .filter((entry) => entry.noteJudgment.criteria.attack.pass === false)
      .map((entry) => entry.noteJudgment.criteria.attack.error);
    const wrongPitchErrors = judged
      .filter((entry) => entry.noteJudgment.criteria.pitch.pass === false)
      .map((entry) => entry.noteJudgment.criteria.pitch.error);
    const inaccurateAttackErrors = judged
      .filter((entry) => entry.kind === 'inaccurate' && entry.noteJudgment.criteria.attack.pass === false)
      .map((entry) => entry.noteJudgment.criteria.attack.error);
    const releaseErrors = judged
      .filter((entry) => entry.noteJudgment.criteria.release.pass === false)
      .map((entry) => entry.noteJudgment.criteria.release.error);
    const mutingErrors = judged
      .filter((entry) => entry.noteJudgment.criteria.muting.pass === false)
      .map((entry) => entry.noteJudgment.criteria.muting.error);
    const articulationErrors = judged
      .filter((entry) => entry.noteJudgment.criteria.articulation.pass === false)
      .map((entry) => entry.noteJudgment.criteria.articulation.error);
    const velocityErrors = judged
      .filter((entry) => entry.noteJudgment.criteria.velocity.pass === false)
      .map((entry) => entry.noteJudgment.criteria.velocity.error);

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

  const kindCards = [
    { key: 'ok', count: okCount, className: 'stroke-note-ok fill-note-ok' },
    { key: 'inaccurate', count: inaccurateCount, className: 'stroke-note-inacc fill-note-inacc' },
    { key: 'miss', count: missCount, className: 'stroke-note-miss fill-note-miss' },
  ] as const;

  const summaryRows = [
    {
      key: 'recording-length',
      name: 'Recording Length',
      description: 'Total recording duration',
      content: formatMs(recordingLengthMs),
    },
    {
      key: 'accuracy',
      name: 'Accuracy',
      description: 'OK notes / total reference notes',
      content: `${accuracyPercent.toFixed(1)}%`,
    },
    {
      key: 'timing-bias',
      name: 'Timing Bias',
      description: 'Overall rushing/dragging tendency',
      content: `${Math.abs(rhythmBiasMs).toFixed(2)} ms ${rhythmBiasMs > 0 ? 'dragging' : 'rushing'}`,
    },
    {
      key: 'rhythm-instability',
      name: 'Rhythm Instability (std. dev)',
      description: 'Standard deviation of note attack error',
      content: `${rhythmStdDevMs.toFixed(1)} ms`,
    },
  ] as const;

  const breakdownTabs = [
    {
      value: 'primary',
      title: 'Critical',
      titleHint: 'Critical Errors: instant [Miss]',
      items: [
        {
          value: 'attack-miss',
          name: 'Bad Attack',
          description: 'Attack outside the acceptable window',
          count: breakdownStats.attackMiss.count,
          percent: formatBreakdownPercent(breakdownStats.attackMiss.count),
          average: formatMs(breakdownStats.attackMiss.average),
          worst: formatMs(breakdownStats.attackMiss.worst),
        },
        {
          value: 'pitch-miss',
          name: 'Wrong Pitch',
          description: 'Note played with the wrong pitch',
          count: breakdownStats.pitchMiss.count,
          percent: formatBreakdownPercent(breakdownStats.pitchMiss.count),
          average: formatMs(breakdownStats.pitchMiss.average),
          worst: formatMs(breakdownStats.pitchMiss.worst),
        },
      ],
    },
    {
      value: 'secondary',
      title: 'Secondary',
      titleHint: 'Secondary Errors: may cause [Inaccurate]',
      items: [
        {
          value: 'inaccurate-attack',
          name: 'Inaccurate Attack',
          description: 'Note attack timing that is off but still within a reasonable window',
          count: breakdownStats.attackInaccurate.count,
          percent: formatBreakdownPercent(breakdownStats.attackInaccurate.count),
          average: formatMs(breakdownStats.attackInaccurate.average),
          worst: formatMs(breakdownStats.attackInaccurate.worst),
        },
        {
          value: 'release-fail',
          name: 'Bad Release',
          description: 'Inaccurate note release timing',
          count: breakdownStats.release.count,
          percent: formatBreakdownPercent(breakdownStats.release.count),
          average: formatMs(breakdownStats.release.average),
          worst: formatMs(breakdownStats.release.worst),
        },
        {
          value: 'muting-fail',
          name: 'Bad Muting',
          description: 'Failure to mute properly with audible unintentionally ringing notes',
          count: breakdownStats.muting.count,
          percent: formatBreakdownPercent(breakdownStats.muting.count),
          average: formatMs(breakdownStats.muting.average),
          worst: formatMs(breakdownStats.muting.worst),
        },
        {
          value: 'articulation-fail',
          name: 'Bad Articulation',
          description: 'Outlier waveform compared to the rest of the song',
          count: breakdownStats.articulation.count,
          percent: formatBreakdownPercent(breakdownStats.articulation.count),
          average: formatNumber(breakdownStats.articulation.average, false, '', 1),
          worst: formatNumber(breakdownStats.articulation.worst, false, '', 1),
        },
      ],
    },
    {
      value: 'tertiary',
      title: 'Minor',
      titleHint: 'Tertiary Errors: potential improvements',
      items: [
        {
          value: 'velocity-fail',
          name: 'Inconsistent Velocity',
          description: 'Outlier velocity (either too loud or too quiet) compared to the rest of the song',
          count: breakdownStats.velocity.count,
          percent: formatBreakdownPercent(breakdownStats.velocity.count),
          average: formatNumber(breakdownStats.velocity.average, false, 'dB', 1),
          worst: formatNumber(breakdownStats.velocity.worst, false, 'dB', 1),
        },
      ],
    },
  ] as const;

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
        <p className="px-2 text-sm text-muted-foreground">
          No recording for this track yet. Record audio with the "
          <Circle className="inline-flex" stroke="red" size={12} />
          " button to see analysis results.
        </p>
      ) : (
        <div className="flex flex-col gap-4 select-text">
          {isAnalysisRunning ? (
            <p className="px-2 animate-pulse">Analysis in Progress...</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 select-none">
                {kindCards.map((card) => (
                  <Card key={card.key} className="flex flex-row gap-2 px-4 py-2 justify-between items-center">
                    <Diamond size={14} className={card.className} />
                    <span>{card.count}×</span>
                  </Card>
                ))}
              </div>

              <div className="w-full flex flex-col px-2 gap-2">
                {summaryRows.map((row) => (
                  <DataCountRow
                    key={row.key}
                    name={row.name}
                    description={row.description}
                    content={row.content}
                  />
                ))}
              </div>

              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Error Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Tabs defaultValue="primary" className="w-full">
                    <TabsList variant="line" className="w-full">
                      {breakdownTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} title={tab.titleHint}>
                          {tab.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {breakdownTabs.map((tab) => (
                      <TabsContent key={tab.value} value={tab.value}>
                        <Accordion type="multiple" className="w-full">
                          {tab.items.map((item) => (
                            <AccordionItem key={item.value} value={item.value}>
                              <AccordionTrigger>
                                <DataCountRow
                                  name={item.name}
                                  description={item.description}
                                  content={`${item.count}×`}
                                />
                              </AccordionTrigger>
                              <AccordionContent className="space-y-1 pb-2">
                                <DataCountRow name="Percent" content={item.percent} />
                                <DataCountRow name="Average error" content={item.average} />
                                <DataCountRow name="Worst error" content={item.worst} />
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </TabsContent>
                    ))}
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
