import { useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';

import Panel from '@/components/ui/Panel';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import useEngineStore from '@/store/useEngineStore';
import useLibraryStore from '@/store/useLibraryStore';
import useSessionStore from '@/store/useSessionStore';
import { ChevronDown, Filter, X } from 'lucide-react';

type ReviewRow = {
  referenceIndex: number;
  status: 'ok' | 'inaccurate' | 'miss';
  startMs: number | null;
  endMs: number | null;
  criteria: {
    attack: { error: number | null; pass: boolean | null };
    release: { error: number | null; pass: boolean | null };
    pitch: { error: number | null; pass: boolean | null };
    velocity: { error: number | null; pass: boolean | null };
    muting: { error: number | null; pass: boolean | null };
    articulation: { error: number | null; pass: boolean | null };
  };
};

function SessionReviewWindow({ onClose }: { onClose: () => void }) {
  const { selectedSong, selectedTrackId } = useLibraryStore();
  const { endMs } = useEngineStore();
  const { sessionAnalysisBySelection } = useSessionStore();
  const [selectedJudgments, setSelectedJudgments] = useState<Array<'ok' | 'inaccurate' | 'miss'>>([
    'ok',
    'inaccurate',
    'miss',
  ]);
  const [selectedCriteria, setSelectedCriteria] = useState<Record<'attack' | 'pitch' | 'release' | 'velocity' | 'muting' | 'articulation', 'any' | 'ok' | 'inaccurate' | 'miss' | 'bad'>>({
    attack: 'any',
    pitch: 'any',
    release: 'any',
    velocity: 'any',
    muting: 'any',
    articulation: 'any',
  });

  const selectionId = selectedTrackId === null
    ? null
    : `${selectedSong ?? 'no-song'}::${selectedTrackId}`;
  const sessionAnalysis = selectionId ? (sessionAnalysisBySelection[selectionId] ?? null) : null;

  const reviewRows = useMemo<ReviewRow[]>(() => {
    if (!sessionAnalysis) return [];
    const hasJudgmentSelection = selectedJudgments.length > 0;
    if (!hasJudgmentSelection) return [];

    const matchesCriterion = (
      criterion: 'attack' | 'pitch' | 'release' | 'velocity' | 'muting' | 'articulation',
      row: ReviewRow,
    ) => {
      const selection = selectedCriteria[criterion];
      const judgment = row.criteria[criterion];

      if (selection === 'any') return true;

      switch (criterion) {
        case 'attack':
          if (selection === 'ok') return row.status === 'ok' && judgment.pass === true;
          if (selection === 'inaccurate') return row.status === 'inaccurate' && judgment.pass === false;
          if (selection === 'miss') return row.status === 'miss' && judgment.pass === false;
          return true;
        case 'pitch':
          if (selection === 'ok') return judgment.pass === true;
          if (selection === 'miss') return judgment.pass === false;
          return true;
        default:
          if (selection === 'ok') return judgment.pass === true;
          if (selection === 'bad') return judgment.pass === false;
          return true;
      }
    };

    return sessionAnalysis.referenceJudgments
      .map((judgment) => {
        const playedNote = judgment.playedIndex !== null
          ? sessionAnalysis.playedNotes[judgment.playedIndex] ?? null
          : null;
        return {
          referenceIndex: judgment.referenceIndex,
          status: (judgment.kind ?? 'ok') as ReviewRow['status'],
          startMs: playedNote?.startMs ?? null,
          endMs: playedNote?.endMs ?? null,
          criteria: judgment.criteria,
        };
      })
      .filter((row) => selectedJudgments.includes(row.status as ReviewRow['status']))
      .filter((row) => (['attack', 'pitch', 'release', 'velocity', 'muting', 'articulation'] as const)
        .every((criterion) => matchesCriterion(criterion, row)));
  }, [selectedCriteria, selectedJudgments, sessionAnalysis]);

  const reviewTimelineMarkers = useMemo(() => reviewRows
    .filter((row) => row.startMs !== null)
    .map((row) => ({
      status: row.status,
      startMs: row.startMs as number,
      endMs: row.endMs ?? row.startMs as number,
    })), [reviewRows]);

  const songLengthMs = endMs;

  return (
    <Rnd
      default={{
        x: window.innerWidth - 720,
        y: 80,
        width: 640,
        height: 520,
      }}
      minWidth={520}
      minHeight={380}
      bounds="window"
      dragHandleClassName="review-window-handle"
      enableResizing={{
        top: false,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: false,
      }}
      style={{ zIndex: 100 }}
    >
      <Panel
        title="Review"
        className="review-window-handle h-full w-full overflow-hidden rounded-xl border bg-background shadow-xl"
        contentClassName="w-full px-2"
        isScrollable
        buttonGroup={[
          (
            <Button key="review-close" variant="ghost" size="icon" onClick={onClose}>
              <X />
            </Button>
          ),
        ]}
      >
        <div className="flex flex-col gap-6">
          <Collapsible defaultOpen>
            <section className="flex flex-col gap-3">
              <CollapsibleTrigger asChild className="w-min">
                <Button variant="secondary" className="flex flex-row items-center gap-2">
                  <Filter size={16} />
                  <h3>Judgment Criteria</h3>
                  <ChevronDown className="ml-2 group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <section className="flex flex-row items-center gap-6">
                {(['ok', 'inaccurate', 'miss'] as const).map((status) => (
                  <div key={status} className="inline-flex items-center gap-2">
                    <Checkbox
                      id={`review-status-${status}`}
                      checked={selectedJudgments.includes(status)}
                      onCheckedChange={(checked) => {
                        setSelectedJudgments((prev) => (
                          checked
                            ? [...prev, status]
                            : prev.filter((value) => value !== status)
                        ));
                      }}
                    />
                    <Label htmlFor={`review-status-${status}`}>
                      {status === 'ok' ? 'OK' : status === 'inaccurate' ? 'Inaccurate' : 'Miss'} notes
                    </Label>
                  </div>
                ))}
              </section>
              <CollapsibleContent className="ml-4 grid gap-1">
                {(['attack', 'pitch', 'release', 'velocity', 'muting', 'articulation'] as const).map((criterion) => (
                  <div key={criterion} className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <span className="text-sm capitalize">{criterion}</span>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      spacing={0}
                      value={selectedCriteria[criterion]}
                      onValueChange={(value) => {
                        if (!value) return;
                        setSelectedCriteria((prev) => ({ ...prev, [criterion]: value as typeof prev[typeof criterion] }));
                      }}
                      >
                        {criterion === 'attack' ? (
                          <>
                            <ToggleGroupItem value="any" className="mr-3 !rounded-lg">Any</ToggleGroupItem>
                            <ToggleGroupItem value="ok" className="text-note-ok !rounded-none !rounded-l-lg">OK</ToggleGroupItem>
                            <ToggleGroupItem value="inaccurate" className="text-note-inacc !rounded-none">Inaccurate</ToggleGroupItem>
                            <ToggleGroupItem value="miss" className="text-note-miss !rounded-none !rounded-r-lg">Miss</ToggleGroupItem>
                          </>
                        ) : criterion === 'pitch' ? (
                          <>
                            <ToggleGroupItem value="any" className="mr-3 !rounded-lg">Any</ToggleGroupItem>
                            <ToggleGroupItem value="ok" className="text-note-ok !rounded-none !rounded-l-lg">OK</ToggleGroupItem>
                            <ToggleGroupItem value="miss" className="text-note-miss !rounded-none !rounded-r-lg">Miss</ToggleGroupItem>
                          </>
                        ) : (
                          <>
                            <ToggleGroupItem value="any" className="mr-3 !rounded-lg">Any</ToggleGroupItem>
                            <ToggleGroupItem value="ok" className="text-note-ok !rounded-none !rounded-l-lg">OK</ToggleGroupItem>
                            <ToggleGroupItem value="bad" className="text-note-inacc !rounded-none !rounded-r-lg">Bad</ToggleGroupItem>
                          </>
                        )}
                      </ToggleGroup>
                  </div>
                ))}
              </CollapsibleContent>
            </section>
          </Collapsible>

          <section className="flex flex-col gap-2">
            <div className="flex flex-row items-end justify-between gap-3">
              <h3>Timeline</h3>
              <div className="text-xs text-muted-foreground">{reviewRows.length} notes</div>
            </div>

            <div className="border p-3 rounded-md">
              <div className="relative w-full h-6 bg-muted">
                {reviewTimelineMarkers.map((marker, index) => {
                  const startRatio = Math.max(0, Math.min(1, marker.startMs / Math.max(songLengthMs, 1)));
                  const endRatio = Math.max(startRatio, Math.min(1, marker.endMs / Math.max(songLengthMs, 1)));
                  const markerClassName = marker.status === 'ok'
                    ? 'bg-note-ok'
                    : marker.status === 'inaccurate'
                      ? 'bg-note-inacc'
                      : 'bg-note-miss';
                  return (
                    <button
                      key={`${index}@${marker.startMs}`}
                      className={`absolute top-0 h-full ${markerClassName}`}
                      style={{
                        left: `${startRatio * 100}%`,
                        width: `${(endRatio - startRatio) * 100}%`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </Panel>
    </Rnd>
  );
}

export default SessionReviewWindow;
