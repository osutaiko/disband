import { useMemo } from 'react';
import { Circle, Square } from 'lucide-react';

import Panel from '@/components/ui/Panel';
import { Card } from '@/components/ui/card';
import useLibraryStore from '@/store/useLibraryStore';
import useAudioAnalysisMarkers from './useAudioAnalysisMarkers';
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

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function SessionPanel() {
  const {
    api,
    selectedSong,
    selectedTrackId,
    recordedPaths,
    analyzedNotesBySelection,
  } = useLibraryStore();
  const { noteMarkers } = useAudioAnalysisMarkers(api, selectedTrackId);

  const selectionId = selectedTrackId === null
    ? null
    : `${selectedSong ?? 'no-song'}::${selectedTrackId}`;
  const hasRecording = selectionId ? Boolean(recordedPaths[selectionId]) : false;
  const playedNotes = selectionId ? (analyzedNotesBySelection[selectionId] ?? []) : [];

  const {
    okCount,
    inaccurateCount,
    missCount,
    badAttackCount,
    rhythmStdDevMs,
    accuracyPercent,
    recordingLengthMs,
  } = useMemo(() => {
    const matchWindowMs = 120.0;
    const attackToleranceMs = 50.0;
    const used = new Array(playedNotes.length).fill(false);
    const firstDetectedAttackMs = playedNotes.length > 0
      ? Math.min(...playedNotes.map((note) => note.startMs))
      : Number.POSITIVE_INFINITY;
    const lastDetectedReleaseMs = playedNotes.length > 0
      ? Math.max(...playedNotes.map((note) => note.endMs))
      : Number.NEGATIVE_INFINITY;
    let ok = 0;
    let inaccurate = 0;
    let miss = 0;
    let badAttack = 0;
    let judgedReferenceCount = 0;
    const matchedAttackErrors: number[] = [];

    for (const reference of noteMarkers) {
      const referenceAttackMs = reference.timestamp;
      const referenceReleaseMs = reference.timestamp + reference.length;
      const isWithinDetectedWindow = referenceAttackMs >= firstDetectedAttackMs
        && referenceReleaseMs <= lastDetectedReleaseMs;

      if (!isWithinDetectedWindow) {
        continue;
      }

      judgedReferenceCount += 1;
      let bestIndex = -1;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let i = 0; i < playedNotes.length; i += 1) {
        if (used[i]) continue;

        const played = playedNotes[i];
        const attackErrorMs = played.startMs - reference.timestamp;
        if (Math.abs(attackErrorMs) > matchWindowMs) continue;

        const score = Math.abs(attackErrorMs);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      if (bestIndex < 0) {
        miss += 1;
        continue;
      }

      used[bestIndex] = true;
      const played = playedNotes[bestIndex];
      const attackErrorMs = played.startMs - reference.timestamp;
      matchedAttackErrors.push(attackErrorMs);

      const badAttackForNote = Math.abs(attackErrorMs) > attackToleranceMs;
      if (badAttackForNote) {
        badAttack += 1;
        inaccurate += 1;
      } else {
        ok += 1;
      }
    }

    const recordingLength = playedNotes.reduce((max, note) => Math.max(max, note.endMs), 0);
    const totalReference = judgedReferenceCount;
    const accuracy = totalReference > 0 ? (ok / totalReference) * 100 : 0;

    return {
      okCount: ok,
      inaccurateCount: inaccurate,
      missCount: miss,
      badAttackCount: badAttack,
      rhythmStdDevMs: standardDeviation(matchedAttackErrors),
      accuracyPercent: accuracy,
      recordingLengthMs: recordingLength,
    };
  }, [noteMarkers, playedNotes]);

  return (
    <Panel
      title="This Session"
      isCollapsible
      className="border-b"
    >
      {!hasRecording ? (
        <p className="p-2 text-sm text-muted-foreground">
          No recording for this track yet. Record audio with the "
          <Circle className="inline-flex" stroke="red" size={12} />" button to see analysis results.
        </p>
      ) : (
        <div className="flex flex-col gap-4 p-2 select-text">
          <div className="w-full flex flex-col gap-2">
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
              content={`20.0 ms dragging`}
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
                    <Square className="text-note-ok" size={12} />
                    <p>OK</p>
                  </div>
                  <p className="text-note-ok">{`${okCount}×`}</p>
                </AccordionTrigger>
                <AccordionContent>
                  Notes that pass all grading criteria!
                  <br />
                  If you think some of these notes don't deserve an <span className="text-note-ok">OK</span>,
                  adjust your tolerance settings in the <h2 className="underline text-sm inline-flex">OPTIONS</h2> panel.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="Inaccurate">
                <AccordionTrigger className="flex flex-row items-center justify-between gap-4">
                  <div className="w-full flex flex-row items-center gap-2">
                    <Square className="text-note-inacc" size={12} />
                    <p>Inaccurate</p>
                  </div>
                  <p className="text-note-inacc">{`${inaccurateCount}×`}</p>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 h-fit">
                  <DataCountRow
                    name="Bad Attack"
                    description="Notes played with bad attack (start of note) timing"
                    content={`${badAttackCount}×`}
                  />
                  <DataCountRow
                    name="Bad Release"
                    description="N/A"
                    content="0×"
                  />
                  <DataCountRow
                    name="Wrong Pitch"
                    description="N/A"
                    content="0×"
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
                    <Square className="text-note-miss" size={12} />
                    <p>Miss</p>
                  </div>
                  <p className="text-note-miss">{`${missCount}×`}</p>
                </AccordionTrigger>
                <AccordionContent>
                  Notes in the original score that were missed.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      )}
    </Panel>
  );
}

export default SessionPanel;
