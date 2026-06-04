'use client';

import 'apexsankey';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ApexSankey, { type GraphData, type SankeyOptions, type SankeyNode } from 'react-apexsankey';
import type { CatalogMapGraph } from '@/lib/api/catalog-map';

interface Props {
  graph: CatalogMapGraph;
}

type TimeFilter = 'all' | 'day' | 'night';

const options: Omit<Partial<SankeyOptions>, 'onNodeClick'> = {
  width: '100%',
  height: 680,
  nodeWidth: 18,
  nodeBorderWidth: 0,
  edgeOpacity: 0.34,
  edgeGradientFill: true,
  enableTooltip: true,
  enableToolbar: false,
  fontFamily: 'var(--font-roboto-slab), ui-serif, serif',
  fontSize: '12px',
  fontWeight: '700',
  fontColor: '#1A1714',
  spacing: 48,
  canvasStyle: 'background: transparent;',
  tooltipTemplate: ({ source, target, value }) =>
    `<div style="padding:8px 10px;font-family:system-ui,sans-serif;font-size:12px;color:#1A1714"><strong>${source.title}</strong> → <strong>${target.title}</strong><br/>Connection weight: ${value}</div>`,
};

const timeFilters: Array<{ label: string; value: TimeFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Day', value: 'day' },
  { label: 'Night', value: 'night' },
];

export const CatalogSankey = ({ graph }: Props) => {
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [noteFamily, setNoteFamily] = useState('all');

  const noteFamilies = useMemo(
    () =>
      Array.from(
        new Set(
          graph.nodes
            .filter((node) => node.group === 'note' && node.family)
            .map((node) => node.family as string),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [graph.nodes],
  );

  const data = useMemo<GraphData>(() => {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const productsForTime = new Set(
      timeFilter === 'all'
        ? graph.nodes.filter((node) => node.group === 'product').map((node) => node.id)
        : graph.edges
            .filter((edge) => edge.type === 'time' && edge.target === `time:${timeFilter}`)
            .map((edge) => edge.source),
    );

    const noteEdges = graph.edges.filter((edge) => {
      const targetNode = nodeById.get(edge.target);

      return (
        productsForTime.has(edge.source) &&
        targetNode?.group === 'note' &&
        (noteFamily === 'all' || targetNode.family === noteFamily)
      );
    });

    const visibleProducts = new Set(noteEdges.map((edge) => edge.source));
    const timeEdges = graph.edges.filter(
      (edge) =>
        edge.type === 'time' &&
        visibleProducts.has(edge.source) &&
        (timeFilter === 'all' || edge.target === `time:${timeFilter}`),
    );
    const edges = [...noteEdges, ...timeEdges];
    const visibleNodeIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));

    return {
      nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
      edges,
    };
  }, [graph.edges, graph.nodes, noteFamily, timeFilter]);

  const handleNodeClick = (node: SankeyNode) => {
    const sourceNode = graph.nodes.find((graphNode) => graphNode.id === node.id);

    if (sourceNode?.group !== 'product' || !sourceNode.slug) {
      return;
    }

    router.push(`/${locale}/product/${sourceNode.slug}`);
  };

  return (
    <div className="border-border/80 bg-bone overflow-hidden rounded-2xl border p-4 shadow-sm dark:bg-[#1A1714]/30">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {timeFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTimeFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.16em] uppercase transition ${
                timeFilter === filter.value
                  ? 'border-ink bg-ink text-bone dark:border-bone dark:bg-bone dark:text-ink'
                  : 'border-border text-ink-muted hover:border-brass hover:text-brass'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="text-ink-muted flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
          Notes
          <select
            value={noteFamily}
            onChange={(event) => setNoteFamily(event.target.value)}
            className="border-border bg-background text-ink rounded-full border px-3 py-2 text-xs font-semibold uppercase"
          >
            <option value="all">All families</option>
            {noteFamilies.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.nodes.length > 0 && data.edges.length > 0 ? (
        <ApexSankey
          data={data}
          options={options}
          onNodeClick={handleNodeClick}
          className="min-h-[680px] w-full"
        />
      ) : (
        <div className="text-ink-muted flex min-h-[280px] items-center justify-center text-center text-sm">
          No perfume-note links match these filters.
        </div>
      )}
    </div>
  );
};
