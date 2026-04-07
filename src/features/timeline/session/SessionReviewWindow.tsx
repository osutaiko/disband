import { useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';

import type { NoteJudgmentKind } from '../../../../shared/types';
import { getNoteJudgmentClass } from '@/lib/noteJudgmentClasses';
import {
  getCriterionJudgmentStatus,
  formatNumber,
  parseMs,
  type CriterionName,
} from '@/lib/utils';
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
  noteJudgmentKind: NoteJudgmentKind;
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

const REFERENCE_COLUMN_WIDTH = '13rem';
const RECORDED_COLUMN_WIDTH = '13rem';
const STATE_COLUMN_WIDTH = '6rem';
const CRITERION_COLUMN_WIDTH = 'calc((100% - 32rem) / 6)';
const STATE_COLUMN_CLASS = 'sticky top-0 px-0 text-center';
const CRITERION_COLUMN_CLASS = 'sticky top-0 px-0 text-center text-muted-foreground';
const CRITERION_CELL_CLASS = 'px-0 pr-1 text-right';

function formatCriterionError(error: number | null, digits = 1) {
  if (error === null) return '-';
  const value = Number.isFinite(error) ? error : 0;
  const signed = value > 0 ? `+${value.toFixed(digits)}` : value.toFixed(digits);
  return signed;
}

function getCriterionUnderlineClass(status: ReturnType<typeof getCriterionJudgmentStatus>) {
  if (status === 'ok') return 'border-note-ok text-foreground';
  if (status === 'inaccurate') return 'border-note-inacc text-foreground';
  if (status === 'miss') return 'border-note-miss text-foreground';
  return 'border-note-unj text-muted-foreground';
}

function SessionReviewWindow({ onClose }: { onClose: () => void }) {
  const { selectedSong, selectedTrackId } = useLibraryStore();
  const { api, endMs, currentMs } = useEngineStore();
  const { sessionAnalysisBySelection } = useSessionStore();
  const { noteMarkers } = useAudioAnalysisMarkers(api, selectedTrackId);
  const [selectedNoteJudgmentKinds, setSelectedNoteJudgmentKinds] = useState<Array<Exclude<NoteJudgmentKind, 'unjudged'>>>([
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
    const hasNoteJudgmentSelection = selectedNoteJudgmentKinds.length > 0;
    if (!hasNoteJudgmentSelection) return [];

    const matchesCriterion = (
      criterion: 'attack' | 'pitch' | 'release' | 'velocity' | 'muting' | 'articulation',
      row: ReviewRow,
    ) => {
      const selection = selectedCriteria[criterion];
      const judgment = row.criteria[criterion];
      const criterionJudgmentStatus = getCriterionJudgmentStatus({
        criterion,
        noteJudgmentKind: row.noteJudgmentKind,
        pass: judgment.pass,
      });

      if (selection === 'any') return true;

      switch (criterion) {
        case 'attack':
          if (selection === 'ok') return criterionJudgmentStatus === 'ok';
          if (selection === 'inaccurate') return criterionJudgmentStatus === 'inaccurate';
          if (selection === 'miss') return criterionJudgmentStatus === 'miss';
          return true;
        case 'pitch':
          if (selection === 'ok') return criterionJudgmentStatus === 'ok';
          if (selection === 'miss') return criterionJudgmentStatus === 'miss';
          return true;
        default:
          if (selection === 'ok') return criterionJudgmentStatus === 'ok';
          if (selection === 'bad') return criterionJudgmentStatus === 'miss';
          return true;
      }
    };

    return sessionAnalysis.noteJudgments
      .map((noteJudgment) => {
        const referenceNote = noteMarkers[noteJudgment.referenceIndex] ?? null;
        const playedNote = noteJudgment.playedIndex !== null
          ? sessionAnalysis.playedNotes[noteJudgment.playedIndex] ?? null
          : null;
        return {
          referenceIndex: noteJudgment.referenceIndex,
          referenceMs: referenceNote?.timestamp ?? null,
          referenceEndMs: referenceNote === null ? null : referenceNote.timestamp + referenceNote.length,
          noteJudgmentKind: noteJudgment.kind,
          startMs: playedNote?.startMs ?? null,
          endMs: playedNote?.endMs ?? null,
          criteria: noteJudgment.criteria,
        };
      })
      .filter((row) => row.noteJudgmentKind !== 'unjudged')
      .filter((row) => selectedNoteJudgmentKinds.includes(row.noteJudgmentKind as Exclude<NoteJudgmentKind, 'unjudged'>))
      .filter((row) => (['attack', 'pitch', 'release', 'velocity', 'muting', 'articulation'] as const)
        .every((criterion) => matchesCriterion(criterion, row)));
  }, [noteMarkers, selectedCriteria, selectedNoteJudgmentKinds, sessionAnalysis]);

  const reviewTimelineMarkers = useMemo(() => reviewRows
    .filter((row) => row.startMs !== null)
    .map((row) => ({
      noteJudgmentKind: row.noteJudgmentKind,
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

  const renderCriterionError = (
    criterion: CriterionName,
    noteJudgmentKind: ReviewRow['noteJudgmentKind'],
    error: number | null,
    pass: boolean | null,
    unit: string,
  ) => {
    const criterionJudgmentStatus = getCriterionJudgmentStatus({ criterion, noteJudgmentKind, pass });
    const underlineClassName = getCriterionUnderlineClass(criterionJudgmentStatus);
    const digits = criterion === 'pitch' ? 0 : 1;
    return (
      <span
        title={formatNumber(error, true, unit, digits)}
        className={`inline-flex w-full items-center justify-end border-b-2 pb-0.5 pr-1 text-right text-[10px] leading-none ${underlineClassName}`}
      >
        {formatCriterionError(error, digits)}
      </span>
    );
  };

  return (
    <Rnd
      default={{
        x: window.innerWidth - 880,
        y: 80,
        width: 800,
        height: 520,
      }}
      minWidth={800}
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
          <Collapsible>
            <section className="flex flex-col gap-3">
              <CollapsibleTrigger asChild className="w-min">
                <Button variant="secondary" className="group flex flex-row items-center gap-2">
                  <Filter size={16} />
                  <h3>Judgment Criteria</h3>
                  <ChevronDown className="ml-2 group-data-[state=open]:rotate-180 transition-transform duration-200" />
                </Button>
              </CollapsibleTrigger>
              <section className="flex flex-row items-center gap-6">
                {(['ok', 'inaccurate', 'miss'] as const).map((noteJudgmentKind) => (
                  <div key={noteJudgmentKind} className="inline-flex items-center gap-2">
                    <Checkbox
                      id={`review-status-${noteJudgmentKind}`}
                      checked={selectedNoteJudgmentKinds.includes(noteJudgmentKind)}
                      onCheckedChange={(checked) => {
                        setSelectedNoteJudgmentKinds((prev) => (
                          checked
                            ? [...prev, noteJudgmentKind]
                            : prev.filter((value) => value !== noteJudgmentKind)
                        ));
                      }}
                    />
                    <Label htmlFor={`review-status-${noteJudgmentKind}`}>
                      {noteJudgmentKind === 'ok' ? 'OK' : noteJudgmentKind === 'inaccurate' ? 'Inaccurate' : 'Miss'} notes
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
                {reviewRows.length} / {sessionAnalysis?.noteJudgments.length ?? '-'} notes
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
                    const markerClassName = getNoteJudgmentClass(marker.noteJudgmentKind);
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
            
            <div className="flex flex-col rounded-md overflow-hidden overflow-x-auto">
              <Table className="table-fixed min-w-[760px]">
                <colgroup>
                  <col style={{ width: REFERENCE_COLUMN_WIDTH }} />
                  <col style={{ width: RECORDED_COLUMN_WIDTH }} />
                  <col style={{ width: STATE_COLUMN_WIDTH }} />
                  {CRITERION_COLUMNS.map((column) => (
                    <col key={column.key} style={{ width: CRITERION_COLUMN_WIDTH }} />
                  ))}
                </colgroup>
                <TableHeader className="uppercase tracking-widest bg-accent">
                  <TableRow>
                    <TableHead className="sticky top-0">Reference</TableHead>
                    <TableHead className="sticky top-0">Recorded</TableHead>
                    <TableHead className={`${STATE_COLUMN_CLASS}`} style={{ width: STATE_COLUMN_WIDTH, minWidth: STATE_COLUMN_WIDTH }}>
                      State
                    </TableHead>
                    {CRITERION_COLUMNS.map((column) => (
                      <TableHead
                        key={column.key}
                        className={CRITERION_COLUMN_CLASS}
                        style={{ width: CRITERION_COLUMN_WIDTH, minWidth: 0 }}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[250px] min-w-[760px]">
                {reviewRows.length === 0 && <p className="p-2">Nothing to show here.</p>}
                <Table className="table-fixed min-w-[760px]">
                  <colgroup>
                    <col style={{ width: REFERENCE_COLUMN_WIDTH }} />
                    <col style={{ width: RECORDED_COLUMN_WIDTH }} />
                    <col style={{ width: STATE_COLUMN_WIDTH }} />
                    {CRITERION_COLUMNS.map((column) => (
                      <col key={column.key} style={{ width: CRITERION_COLUMN_WIDTH }} />
                    ))}
                  </colgroup>
                  <TableBody>
                    {reviewRows.map((row) => (
                      <TableRow key={row.referenceIndex} className="even:bg-muted/50 [&>td]:!py-0.5">
                        <TableCell className="min-w-0 overflow-hidden text-left">
                          <Button
                            variant="ghost"
                            className="h-full w-full justify-start px-2 font-mono text-left whitespace-nowrap overflow-hidden text-ellipsis"
                            title={row.referenceMs === null ? '' : `${formatMs(row.referenceMs)} - ${formatMs(row.referenceEndMs)}`}
                            onClick={() => {
                              if (row.referenceMs === null) return;
                              handleSeekToMs(api, row.referenceMs);
                            }}
                          >
                            {formatMs(row.referenceMs)} - {formatMs(row.referenceEndMs)}
                          </Button>
                        </TableCell>
                        <TableCell className="min-w-0 overflow-hidden text-left">
                          <Button
                            variant="ghost"
                            className="h-full w-full justify-start px-2 font-mono text-left whitespace-nowrap overflow-hidden text-ellipsis"
                            title={row.startMs === null ? '' : `${formatMs(row.startMs)} - ${formatMs(row.endMs)}`}
                            onClick={() => {
                              if (row.startMs === null) return;
                              handleSeekToMs(api, row.startMs);
                            }}
                          >
                            {formatMs(row.startMs)} - {formatMs(row.endMs)}
                          </Button>
                        </TableCell>
                        <TableCell className={`${STATE_COLUMN_CLASS}`} style={{ width: STATE_COLUMN_WIDTH, minWidth: STATE_COLUMN_WIDTH }}>
                          <Badge
                            variant="default"
                            className={`ml-auto ${getNoteJudgmentClass(row.noteJudgmentKind)}`}
                          >
                            {row.noteJudgmentKind === 'ok' ? 'OK' : row.noteJudgmentKind === 'inaccurate' ? 'Inaccurate' : 'Miss'}
                          </Badge>
                        </TableCell>
                        {CRITERION_COLUMNS.map((column) => (
                          <TableCell
                            key={column.key}
                            className={CRITERION_CELL_CLASS}
                            style={{ width: CRITERION_COLUMN_WIDTH, minWidth: 0 }}
                          >
                            {renderCriterionError(
                              column.key,
                              row.noteJudgmentKind,
                              row.criteria[column.key].error,
                              row.criteria[column.key].pass,
                              column.key === 'pitch' ? 'semitones' : column.key === 'velocity' ? 'dB' : 'ms',
                            )}
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
