import { formatMs, formatNumber } from '@/lib/utils';
import { handleSeekToMs } from '@/features/engine/playback';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Scatter,
  ScatterChart,
} from 'recharts';
import type { AlphaTabApi } from '@coderline/alphatab';
import type { NoteJudgmentKind } from '../../../../shared/types';

export type SessionAttackHistogramBin = {
  centerMs: number;
  start: number;
  end: number;
  count: number;
};

export type SessionAttackScatterPoint = {
  timelineMs: number;
  attackErrorMs: number;
  judgmentKind: Exclude<NoteJudgmentKind, 'unjudged'>;
  region: 'ok' | 'inaccurate' | 'miss';
  referenceMs: number;
};

export type SessionAttackHistogramRow = SessionAttackHistogramBin & {
  region: 'ok' | 'inaccurate' | 'miss';
};

export type SessionAttackHistogramViewModel = {
  bars: SessionAttackHistogramRow[];
  scatterPoints: SessionAttackScatterPoint[];
  ticks: number[];
  okWindowMs: number;
  inaccurateWindowMs: number;
  totalCount: number;
  min: number;
  max: number;
  maxCount: number;
};

const REGION_STYLE = {
  ok: {
    fill: 'var(--note-ok-bg)',
    stroke: 'var(--note-ok)',
    barFill: 'var(--note-ok-bg)',
  },
  inaccurate: {
    fill: 'var(--note-inacc-bg)',
    stroke: 'var(--note-inacc)',
    barFill: 'var(--note-inacc-bg)',
  },
  miss: {
    fill: 'var(--note-miss-bg)',
    stroke: 'var(--note-miss)',
    barFill: 'var(--note-miss-bg)',
  },
} as const;

function AttackScatterDot({
  cx,
  cy,
  payload,
  onSeek,
}: {
  cx?: number;
  cy?: number;
  payload?: SessionAttackScatterPoint;
  onSeek: () => void;
}) {
  if (cx === undefined || cy === undefined || !payload) return null;

  const regionStyle = REGION_STYLE[payload.region];

  return (
    <g className="cursor-pointer" style={{ pointerEvents: 'all' }}>
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        fill={regionStyle.fill}
        stroke={regionStyle.stroke}
        strokeWidth={1}
        style={{ pointerEvents: 'all' }}
        onPointerDown={() => {
          onSeek();
        }}
      />
    </g>
  );
}

export default function SessionAttackReviewCharts({
  api,
  currentMs,
  songLengthMs,
  recordedRange,
  attackHistogram,
}: {
  api: AlphaTabApi | null;
  currentMs: number;
  songLengthMs: number;
  recordedRange: { startMs: number; endMs: number } | null;
  attackHistogram: SessionAttackHistogramViewModel;
}) {
  return (
    <Card>
      <CardContent className="p-2">
        <div className="relative grid h-[300px] grid-cols-[minmax(0,1fr)_3rem] gap-1">
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 8, bottom: 10, left: -8 }}
                accessibilityLayer={false}
              >
                <XAxis
                  dataKey="timelineMs"
                  type="number"
                  domain={[0, songLengthMs]}
                  tickFormatter={formatMs}
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 11 }}
                  tickMargin={6}
                />
                <YAxis
                  dataKey="attackErrorMs"
                  type="number"
                  domain={[attackHistogram.min, attackHistogram.max]}
                  ticks={attackHistogram.ticks}
                  interval={0}
                  tickFormatter={(value) => formatNumber(value, true)}
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 11 }}
                  tickMargin={6}
                />
                <ReferenceArea
                  y1={-attackHistogram.okWindowMs}
                  y2={attackHistogram.okWindowMs}
                  fill="var(--note-ok-bg)"
                  fillOpacity={0.26}
                />
                <ReferenceArea
                  y1={-attackHistogram.inaccurateWindowMs}
                  y2={-attackHistogram.okWindowMs}
                  fill="var(--note-inacc-bg)"
                  fillOpacity={0.22}
                />
                <ReferenceArea
                  y1={attackHistogram.okWindowMs}
                  y2={attackHistogram.inaccurateWindowMs}
                  fill="var(--note-inacc-bg)"
                  fillOpacity={0.22}
                />
                {recordedRange ? (
                  <ReferenceArea
                    x1={recordedRange.startMs}
                    x2={recordedRange.endMs}
                    y1={attackHistogram.min}
                    y2={attackHistogram.max}
                    fill="var(--rec-track-bg)"
                    fillOpacity={0.6}
                  />
                ) : null}
                <ReferenceLine y={0} stroke="var(--note-ok)" strokeDasharray="3 3" />
                <ReferenceLine y={attackHistogram.okWindowMs} stroke="var(--note-ok)" />
                <ReferenceLine y={-attackHistogram.okWindowMs} stroke="var(--note-ok)" />
                <ReferenceLine y={attackHistogram.inaccurateWindowMs} stroke="var(--note-inacc)" />
                <ReferenceLine y={-attackHistogram.inaccurateWindowMs} stroke="var(--note-inacc)" />
                <ReferenceLine x={currentMs} stroke="var(--playhead)" strokeWidth={1} />
                <Scatter
                  data={attackHistogram.scatterPoints}
                  isAnimationActive={false}
                  stroke="none"
                  shape={(props) => (
                    <AttackScatterDot
                      {...props}
                      onSeek={() => {
                        handleSeekToMs(api, (props.payload as SessionAttackScatterPoint).referenceMs);
                      }}
                    />
                  )}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attackHistogram.bars}
                layout="vertical"
                margin={{ top: 20, right: 0, bottom: 10, left: 0 }}
                accessibilityLayer={false}
              >
                <XAxis
                  type="number"
                  domain={[0, attackHistogram.maxCount]}
                  height={30}
                  tick={false}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  hide
                  dataKey="centerMs"
                  type="number"
                  domain={[attackHistogram.min, attackHistogram.max]}
                  ticks={attackHistogram.ticks}
                  interval={0}
                  reversed
                />
                <Bar dataKey="count" maxBarSize={22} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {attackHistogram.bars.map((bin) => (
                    <Cell
                      key={`${bin.start}-${bin.end}`}
                      fill={REGION_STYLE[bin.region].barFill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
