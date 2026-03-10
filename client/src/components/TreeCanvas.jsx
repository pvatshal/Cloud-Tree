import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow, MiniMap, Controls, Background,
  addEdge, useNodesState, useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MemberCard from './MemberCard';
import { useTheme } from '../context/ThemeContext';

const NODE_W = 200;
const NODE_H = 160;
const H_GAP  = 70;
const V_GAP  = 110;

// ── Node Types (outside component to avoid recreation) ──────────────────────
const nodeTypes = {
  memberNode: ({ data }) => {
    if (!data?.member) return null;
    return <MemberCard member={data.member} onEdit={data.onEdit} onDelete={data.onDelete} />;
  },
};

// ── Layout Algorithm ─────────────────────────────────────────────────────────
function buildLayout(members) {
  if (!members.length) return { nodes: [], edges: [] };

  const byId = {};
  members.forEach(m => { byId[String(m._id)] = m; });
  const memberIdSet = new Set(members.map(m => String(m._id)));

  // Step 1: BFS generations — parent→child only
  const genMap = {};
  const roots = members.filter(m => !(m.parents || []).length);
  if (!roots.length) roots.push(members[0]);

  const queue = roots.map(r => ({ id: String(r._id), gen: 0 }));
  const visited = new Set();

  while (queue.length) {
    const { id, gen } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    genMap[id] = gen;
    const m = byId[id];
    if (!m) continue;
    (m.children || []).forEach(c => {
      const cId = String(c);
      if (!visited.has(cId)) queue.push({ id: cId, gen: gen + 1 });
    });
  }

  // Step 2: Propagate spouse generations
  let changed = true;
  while (changed) {
    changed = false;
    members.forEach(m => {
      const id = String(m._id);
      const sid = m.spouse ? String(m.spouse) : null;
      if (!sid) return;
      if (genMap[id] !== undefined && genMap[sid] === undefined) {
        genMap[sid] = genMap[id]; changed = true;
      } else if (genMap[sid] !== undefined && genMap[id] === undefined) {
        genMap[id] = genMap[sid]; changed = true;
      }
    });
  }

  // Step 3: Assign any remaining unvisited members to gen 0
  members.forEach(m => {
    if (genMap[String(m._id)] === undefined) genMap[String(m._id)] = 0;
  });

  const maxGen = Math.max(...Object.values(genMap));
  const genGroups = {};
  for (let g = 0; g <= maxGen; g++) genGroups[g] = [];
  members.forEach(m => genGroups[genMap[String(m._id)]].push(String(m._id)));

  // Step 4: Layout units (couples side by side)
  const posMap = {};

  for (let g = 0; g <= maxGen; g++) {
    const ids = genGroups[g];
    if (!ids.length) continue;

    const seen = new Set();
    const units = [];

    ids.forEach(id => {
      if (seen.has(id)) return;
      seen.add(id);
      const m = byId[id];
      const sid = m?.spouse ? String(m.spouse) : null;
      if (sid && ids.includes(sid) && !seen.has(sid)) {
        seen.add(sid);
        const spouse = byId[sid];
        // Put male first, female second
        if (m.gender === 'female' && spouse?.gender === 'male') {
          units.push([sid, id]);
        } else {
          units.push([id, sid]);
        }
      } else {
        units.push([id]);
      }
    });

    const totalWidth = units.reduce((acc, u, i) =>
      acc + (u.length === 2 ? NODE_W * 2 + H_GAP : NODE_W) + (i < units.length - 1 ? H_GAP : 0), 0
    );

    let x = -totalWidth / 2;
    const y = g * (NODE_H + V_GAP);

    units.forEach((unit, i) => {
      if (unit.length === 2) {
        posMap[unit[0]] = { x, y };
        posMap[unit[1]] = { x: x + NODE_W + H_GAP, y };
        x += NODE_W * 2 + H_GAP + (i < units.length - 1 ? H_GAP : 0);
      } else {
        posMap[unit[0]] = { x, y };
        x += NODE_W + (i < units.length - 1 ? H_GAP : 0);
      }
    });
  }

  // Step 5: Center children under their parents
  for (let g = maxGen; g >= 1; g--) {
    const ids = genGroups[g];
    const seen = new Set();
    const siblingGroups = [];

    ids.forEach(id => {
      if (seen.has(id)) return;
      const m = byId[id];
      const parents = (m?.parents || []).map(String).filter(p => memberIdSet.has(p));
      if (!parents.length) return;

      const siblings = ids.filter(sid => {
        const sp = (byId[sid]?.parents || []).map(String);
        return parents.some(p => sp.includes(p));
      });
      siblings.forEach(s => seen.add(s));
      siblingGroups.push({ parents, siblings });
    });

    siblingGroups.forEach(({ parents, siblings }) => {
      const parentPos = parents.map(p => posMap[p]).filter(Boolean);
      if (!parentPos.length) return;
      const parentCenterX = parentPos.reduce((s, p) => s + p.x + NODE_W / 2, 0) / parentPos.length;
      const totalW = siblings.length * NODE_W + (siblings.length - 1) * H_GAP;
      const startX = parentCenterX - totalW / 2;
      const sorted = [...siblings].sort((a, b) => (posMap[a]?.x || 0) - (posMap[b]?.x || 0));
      sorted.forEach((sid, i) => {
        if (posMap[sid]) posMap[sid] = { ...posMap[sid], x: startX + i * (NODE_W + H_GAP) };
      });
    });
  }

  // Step 6: Build ReactFlow nodes (handlers injected later)
  const nodes = members.map(m => ({
    id: String(m._id),
    type: 'memberNode',
    position: posMap[String(m._id)] || { x: 0, y: 0 },
    data: { member: m, onEdit: null, onDelete: null },
  }));

  // Step 7: Build edges — soft, thin, modern
  const parentEdges = members.flatMap(m =>
    (m.children || [])
      .map(String)
      .filter(cId => memberIdSet.has(cId))
      .map(cId => ({
        id: `parent-${String(m._id)}-${cId}`,
        source: String(m._id),
        target: cId,
        type: 'smoothstep',
        style: { stroke: '#4ade80', strokeWidth: 1.8, opacity: 0.85 },
        markerEnd: { type: 'arrowclosed', color: '#4ade80', width: 16, height: 16 },
      }))
  );

  const seenSpouses = new Set();
  const spouseEdges = members
    .filter(m => m.spouse && memberIdSet.has(String(m.spouse)))
    .filter(m => {
      const key = [String(m._id), String(m.spouse)].sort().join('-');
      if (seenSpouses.has(key)) return false;
      seenSpouses.add(key);
      return true;
    })
    .map(m => ({
      id: `spouse-${[String(m._id), String(m.spouse)].sort().join('-')}`,
      source: String(m._id),
      target: String(m.spouse),
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'straight',
      animated: true,
      style: { stroke: '#fbbf24', strokeWidth: 1.8, opacity: 0.85, strokeDasharray: '6 3' },
      label: '💍',
      labelStyle: { fontSize: 12, fontFamily: 'DM Sans, sans-serif' },
      labelBgStyle: { fill: 'transparent' },
    }));

  return { nodes, edges: [...parentEdges, ...spouseEdges] };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TreeCanvas({ members, onEdit, onDelete }) {
  const { dark } = useTheme();

  // Inject handlers into node data
  const injectHandlers = (nodes) =>
    nodes.map(n => ({ ...n, data: { ...n.data, onEdit, onDelete } }));

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildLayout(members), [members]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(injectHandlers(initNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  const onConnect = useCallback(
    params => setEdges(eds => addEdge(params, eds)), []
  );

  useEffect(() => {
    const { nodes: ln, edges: le } = buildLayout(members);
    setNodes(injectHandlers(ln));
    setEdges(le);
  }, [members, onEdit, onDelete]);

  return (
    <div style={{ width: '100vw', height: 'calc(100vh - 64px)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          nodeColor={n => {
            const m = members.find(m => String(m._id) === n.id);
            const colors = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6' };
            return colors[m?.gender] || '#4ade80';
          }}
          maskColor={dark ? 'rgba(0,0,0,0.6)' : 'rgba(240,253,244,0.7)'}
          style={{ background: dark ? '#0d1f13' : '#f0fdf4' }}
        />
        <Controls showInteractive={false} />
        <Background
          color={dark ? '#1e3a2a' : '#bbf7d0'}
          gap={24}
          size={1.5}
          style={{ opacity: dark ? 0.4 : 0.7 }}
        />
      </ReactFlow>
    </div>
  );
}