import { useMemo } from 'react';

import { Circle, Square } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import useSessionStore from '@/store/useSessionStore';
import { valsStdDev, valsTruncatedMean } from '@/lib/utils';

import Panel from '@/components/ui/Panel';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
    badAttackCount,
    badReleaseCount,
    wrongPitchCount,
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
    const badAttack = judged
      .filter((entry) => entry.judgment.criteria.attack.pass === false)
      .length;
    const badRelease = judged
      .filter((entry) => entry.judgment.criteria.release.pass === false)
      .length;
    const wrongPitch = judged
      .filter((entry) => entry.judgment.criteria.pitch.pass === false)
      .length;
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
      badAttackCount: badAttack,
      badReleaseCount: badRelease,
      wrongPitchCount: wrongPitch,
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
              <Card className="flex flex-col gap-2 px-4 py-2">
                <Accordion
                  type="multiple"
                  className="max-w-lg"
                  defaultValue={[]}
                >
                  <AccordionItem value="OK">
                    <AccordionTrigger className="flex flex-row items-center justify-between gap-4">
                      <div className="w-full flex flex-row items-center gap-2">
                        <Square className="text-note-ok fill-current" size={12} />
                        <p>OK</p>
                      </div>
                      <p className="text-note-ok">{`${okCount}×`}</p>
                    </AccordionTrigger>
                    <AccordionContent>
                      Notes that pass all grading criteria!
                      <br />
                      If you think some of these notes do not deserve an
                      {' '}
                      <span className="text-note-ok">OK</span>
                      ,
                      adjust your tolerance settings in the
                      {' '}
                      <h2 className="inline-flex text-sm underline">OPTIONS</h2>
                      {' '}
                      panel.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="Inaccurate">
                    <AccordionTrigger className="flex flex-row items-center justify-between gap-4">
                      <div className="w-full flex flex-row items-center gap-2">
                        <Square className="text-note-inacc fill-current" size={12} />
                        <p>Inaccurate</p>
                      </div>
                      <p className="text-note-inacc">{`${inaccurateCount}×`}</p>
                    </AccordionTrigger>
                    <AccordionContent className="h-fit flex flex-col gap-2">
                      <DataCountRow
                        name="Inaccurate Attack"
                        description="Notes played with inaccurate attack (start of note) timing"
                        content={`${badAttackCount}×`}
                      />
                      <DataCountRow
                        name="Bad Release"
                        description="Notes played with inaccurate release timing, either absolute timestamp (for longer notes) or note duration (for shorter notes)"
                        content={`${badReleaseCount}×`}
                      />
                      <DataCountRow
                        name="Inconsistent Velocity"
                        description="N/A"
                        content="0×"
                      />
                      <DataCountRow
                        name="Bad Muting"
                        description="N/A"
                        content="0×"
                      />
                      <DataCountRow
                        name="Bad Articulation"
                        description="N/A"
                        content="0×"
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="Miss">
                    <AccordionTrigger className="flex flex-row items-center justify-between gap-4">
                      <div className="w-full flex flex-row items-center gap-2">
                        <Square className="text-note-miss fill-current" size={12} />
                        <p>Miss</p>
                      </div>
                      <p className="text-note-miss">{`${missCount}x`}</p>
                    </AccordionTrigger>
                    <AccordionContent className="h-fit flex flex-col gap-2">
                      <DataCountRow
                        name="Wrong Pitch"
                        description="Notes played with the wrong pitch"
                        content={`${wrongPitchCount}×`}
                      />
                      <DataCountRow
                        name="Bad Attack"
                        description="Notes played with attack timing way off"
                        content={`${badAttackCount}×`}
                      />
                      <DataCountRow
                        name="Skipped Notes"
                        description="Notes undetected in recording"
                        content={`${playedNotes.length - wrongPitchCount - badAttackCount}×`}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

export default SessionPanel;
