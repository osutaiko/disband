import { useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';

import { getBadgeStatusClass, getCriterionStatus, type CriterionName } from '@/lib/sessionCriteria';
import { parseMs } from '@/lib/utils';
import useEngineStore from '@/store/useEngineStore';
import useLibraryStore from '@/store/useLibraryStore';
import useSessionStore from '@/store/useSessionStore';

import Panel from '@/components/ui/Panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { handleSeekToMs } from '@/features/engine/playback';
import useAudioAnalysisMarkers from '@/features/timeline/useAudioAnalysisMarkers';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronDown, Filter, X } from 'lucide-react';

type ReviewRow = {
  referenceIndex: number;
  referenceMs: number | null;
  referenceEndMs: number | null;
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

const CRITERION_COLUMNS = [
  { key: 'attack', label: 'att' },
  { key: 'pitch', label: 'pit' },
  { key: 'release', label: 'rel' },
  { key: 'muting', label: 'mut' },
  { key: 'articulation', label: 'art' },
  { key: 'velocity', label: 'vel' },
] as const;

const STATE_COLUMN_CLASS = 'sticky top-0 w-24 min-w-24 max-w-24 px-0 text-center';
const CRITERION_COLUMN_CLASS = 'sticky top-0 w-9 min-w-9 max-w-9 px-0 text-center text-muted-foreground';
const CRITERION_CELL_CLASS = 'w-9 min-w-9 max-w-9 px-0 text-center py-0.5';

function SessionReviewWindow({ onClose }: { onClose: () => void }) {
  const { selectedSong, selectedTrackId } = useLibraryStore();
  const { api, endMs, currentMs } = useEngineStore();
  const { sessionAnalysisBySelection } = useSessionStore();
  const { noteMarkers } = useAudioAnalysisMarkers(api, selectedTrackId);
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
        const referenceNote = noteMarkers[judgment.referenceIndex] ?? null;
        const playedNote = judgment.playedIndex !== null
          ? sessionAnalysis.playedNotes[judgment.playedIndex] ?? null
          : null;
        return {
          referenceIndex: judgment.referenceIndex,
          referenceMs: referenceNote?.timestamp ?? null,
          referenceEndMs: referenceNote === null ? null : referenceNote.timestamp + referenceNote.length,
          status: (judgment.kind ?? 'ok') as ReviewRow['status'],
          startMs: playedNote?.startMs ?? null,
          endMs: playedNote?.endMs ?? null,
          criteria: judgment.criteria,
        };
      })
      .filter((row) => selectedJudgments.includes(row.status as ReviewRow['status']))
      .filter((row) => (['attack', 'pitch', 'release', 'velocity', 'muting', 'articulation'] as const)
        .every((criterion) => matchesCriterion(criterion, row)));
  }, [noteMarkers, selectedCriteria, selectedJudgments, sessionAnalysis]);

  const reviewTimelineMarkers = useMemo(() => reviewRows
    .filter((row) => row.startMs !== null)
    .map((row) => ({
      status: row.status,
      startMs: row.startMs as number,
      endMs: row.endMs ?? row.startMs as number,
    })), [reviewRows]);

  const recordedRange = useMemo(() => {
    if (!sessionAnalysis || sessionAnalysis.playedNotes.length === 0) return null;
    const startMs = sessionAnalysis.playedNotes.reduce((min, note) => Math.min(min, note.startMs), Number.POSITIVE_INFINITY);
    const endMsValue = sessionAnalysis.playedNotes.reduce((max, note) => Math.max(max, note.endMs), 0);
    if (!Number.isFinite(startMs) || endMsValue <= startMs) return null;
    return { startMs, endMs: endMsValue };
  }, [sessionAnalysis]);

  const songLengthMs = endMs;

  const formatMs = (ms: number | null) => {
    if (ms === null) return '';
    const parsed = parseMs(ms);
    return `${parsed.minutes}:${parsed.seconds.toString().padStart(2, '0')}.${parsed.milliseconds.toString().padStart(3, '0')}`;
  };

  const renderCriterionStatus = (
    criterion: CriterionName,
    rowStatus: ReviewRow['status'],
    pass: boolean | null,
  ) => {
    const status = getCriterionStatus({ criterion, rowStatus, pass });
    const badgeClassName = 'inline-block h-3 w-3 rounded-full shrink-0';
    return <span className={`${badgeClassName} ${getBadgeStatusClass(status)}`} />;
  };

  return (
    <Rnd
      default={{
        x: window.innerWidth - 720,
        y: 80,
        width: 700,
        height: 520,
      }}
      minWidth={700}
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
      style={{ zIndex: 1000 }}
    >
      <Panel
        title="Review"
        className="h-full w-full overflow-hidden rounded-xl border bg-background shadow-xl"
        headerClassName="review-window-handle"
        contentClassName="flex-1 min-h-0 overflow-hidden"
        isScrollable
        buttonGroup={[
          (
            <Button key="review-close" variant="ghost" size="icon" onClick={onClose}>
              <X />
            </Button>
          ),
        ]}
      >
        <div className="flex flex-col gap-6 pr-4">
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
              <div className="text-xs text-muted-foreground">
                {reviewRows.length} / {sessionAnalysis?.referenceJudgments.length ?? '-'} notes
              </div>
            </div>

            <div className="border py-2 rounded-md">
            <div className="relative w-full h-10 overflow-visible">
              {recordedRange && (
                <div
                  className="absolute -top-2 -bottom-2 bg-rec-track-bg pointer-events-none z-0"
                  style={{
                    left: `${(recordedRange.startMs / Math.max(songLengthMs, 1)) * 100}%`,
                    width: `${((recordedRange.endMs - recordedRange.startMs) / Math.max(songLengthMs, 1)) * 100}%`,
                  }}
                />
              )}
              <div
                className="absolute -top-2 -bottom-2 w-px bg-playhead pointer-events-none z-0"
                style={{
                  left: `${Math.max(0, Math.min(1, currentMs / Math.max(songLengthMs, 1))) * 100}%`,
                }}
              />
              <div className="absolute inset-y-2 left-0 right-0 z-10 bg-muted">
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
                        width: `${Math.max((endRatio - startRatio) * 100, (1 / Math.max(songLengthMs, 1)) * 100)}%`,
                      }}
                    />
                  );
                })}
              </div>
              </div>
            </div>
            
            <div className="flex flex-col rounded-md overflow-hidden">
              <Table className="table-fixed">
                <TableHeader className="uppercase tracking-widest bg-accent">
                  <TableRow>
                    <TableHead className="sticky top-0">Reference</TableHead>
                    <TableHead className="sticky top-0">Recorded</TableHead>
                    <TableHead className={STATE_COLUMN_CLASS}>State</TableHead>
                    {CRITERION_COLUMNS.map((column) => (
                      <TableHead key={column.key} className={CRITERION_COLUMN_CLASS}>
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[250px]">
                {reviewRows.length === 0 && <p className="p-2">Nothing to show here.</p>}
                <Table className="table-fixed">
                  <TableBody>
                    {reviewRows.map((row) => (
                      <TableRow key={row.referenceIndex} className="even:bg-muted/50">
                        <TableCell className="py-0.5">
                          <Button
                            variant="ghost"
                            className="h-full justify-start px-2 py-0.5 font-mono"
                            title={row.referenceMs === null ? '' : `${row.referenceMs} - ${row.referenceEndMs ?? row.referenceMs}`}
                            onClick={() => {
                              if (row.referenceMs === null) return;
                              handleSeekToMs(api, row.referenceMs);
                            }}
                          >
                            {formatMs(row.referenceMs)} - {formatMs(row.referenceEndMs)}
                          </Button>
                        </TableCell>
                        <TableCell className="py-0.5">
                          <Button
                            variant="ghost"
                            className="h-full justify-start px-2 py-0.5 font-mono"
                            title={row.startMs === null ? '' : `${row.startMs} - ${row.endMs ?? row.startMs}`}
                            onClick={() => {
                              if (row.startMs === null) return;
                              handleSeekToMs(api, row.startMs);
                            }}
                          >
                            {formatMs(row.startMs)} - {formatMs(row.endMs)}
                          </Button>
                        </TableCell>
                        <TableCell className={`${STATE_COLUMN_CLASS} py-0.5`}>
                          <Badge
                            variant="default"
                            className={
                              row.status === 'ok'
                                ? 'bg-note-ok-bg'
                                : row.status === 'inaccurate'
                                  ? 'bg-note-inacc-bg'
                                  : 'bg-note-miss-bg'
                            }
                          >
                            {row.status === 'ok' ? 'OK' : row.status === 'inaccurate' ? 'Inaccurate' : 'Miss'}
                          </Badge>
                        </TableCell>
                        {CRITERION_COLUMNS.map((column) => (
                          <TableCell key={column.key} className={CRITERION_CELL_CLASS}>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-inset ring-black/5">
                              {renderCriterionStatus(
                                column.key,
                                row.status,
                                row.criteria[column.key].pass,
                              )}
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </section>
        </div>
      </Panel>
    </Rnd>
  );
}

export default SessionReviewWindow;
