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

const nodeTypes = {
  memberNode: ({ data }) => {
    if (!data?.member) return null;
    return <MemberCard member={data.member} onEdit={data.onEdit} onDelete={data.onDelete} />;
  },
};

// ── Layout Algorithm ──────────────────────────────────────────────────────────
function buildLayout(members) {
  if (!members.length) return { nodes: [], edges: [] };

  const byId = {};
  members.forEach(m => { byId[String(m._id)] = m; });
  const memberIdSet = new Set(members.map(m => String(m._id)));

  const validParents = (m) =>
    (m.parents || []).map(String).filter(p => memberIdSet.has(p));

  // ── Step 1: BFS generation assignment ──────────────────────────────────────
  const genMap = {};
  const roots  = members.filter(m => validParents(m).length === 0);
  if (!roots.length) roots.push(members[0]);

  const queue = roots.map(r => ({ id: String(r._id), gen: 0 }));
  while (queue.length) {
    const { id, gen } = queue.shift();
    if (genMap[id] !== undefined && genMap[id] >= gen) continue;
    genMap[id] = gen;
    const m = byId[id];
    if (!m) continue;
    (m.children || []).forEach(c => {
      const cId = String(c);
      if (memberIdSet.has(cId)) queue.push({ id: cId, gen: gen + 1 });
    });
  }

  // ── Step 2: Propagate spouse generations ───────────────────────────────────
  let changed = true;
  while (changed) {
    changed = false;
    members.forEach(m => {
      const id  = String(m._id);
      const sid = m.spouse ? String(m.spouse) : null;
      if (!sid || !memberIdSet.has(sid)) return;
      if (genMap[id] !== undefined && genMap[sid] === undefined) {
        genMap[sid] = genMap[id]; changed = true;
      } else if (genMap[sid] !== undefined && genMap[id] === undefined) {
        genMap[id] = genMap[sid]; changed = true;
      }
    });
  }

  // ── Step 2b: Pull parents down to be just above their children ─────────────
  // KEY FIX: Arpan+Kinnari have no parents so BFS puts them at gen 0.
  // But their daughter Drashti is at gen 2 (spouse of Vatsal).
  // This pass pulls Arpan+Kinnari to gen 1 (one above Drashti).
  let pullChanged = true;
  while (pullChanged) {
    pullChanged = false;
    members.forEach(m => {
      const id        = String(m._id);
      const childGens = (m.children || [])
        .map(String)
        .filter(c => memberIdSet.has(c) && genMap[c] !== undefined)
        .map(c => genMap[c]);
      if (!childGens.length) return;
      const required = Math.min(...childGens) - 1;
      if (genMap[id] === undefined || genMap[id] < required) {
        genMap[id] = required;
        pullChanged = true;
      }
    });
  }

  // ── Step 2c: Re-propagate spouse generations after pulling ─────────────────
  changed = true;
  while (changed) {
    changed = false;
    members.forEach(m => {
      const id  = String(m._id);
      const sid = m.spouse ? String(m.spouse) : null;
      if (!sid || !memberIdSet.has(sid)) return;
      const ig = genMap[id];
      const sg = genMap[sid];
      if (ig !== undefined && sg === undefined) {
        genMap[sid] = ig; changed = true;
      } else if (sg !== undefined && ig === undefined) {
        genMap[id] = sg; changed = true;
      } else if (ig !== undefined && sg !== undefined && ig !== sg) {
        const deeper = Math.max(ig, sg);
        if (ig !== deeper) { genMap[id]  = deeper; changed = true; }
        if (sg !== deeper) { genMap[sid] = deeper; changed = true; }
      }
    });
  }

  // ── Step 3: Assign unvisited to gen 0, then normalise ─────────────────────
  members.forEach(m => {
    if (genMap[String(m._id)] === undefined) genMap[String(m._id)] = 0;
  });

  const minGen = Math.min(...Object.values(genMap));
  if (minGen < 0) members.forEach(m => { genMap[String(m._id)] -= minGen; });

  const maxGen = Math.max(...Object.values(genMap));
  const genGroups = {};
  for (let g = 0; g <= maxGen; g++) genGroups[g] = [];
  members.forEach(m => genGroups[genMap[String(m._id)]].push(String(m._id)));

  const posMap = {};

  // ── Helpers ────────────────────────────────────────────────────────────────
  function spouseInGen(id, g) {
    const m   = byId[id];
    const sid = m?.spouse ? String(m.spouse) : null;
    if (sid && memberIdSet.has(sid) && genMap[sid] === g) return sid;
    return null;
  }

  function buildUnits(ids, g) {
    const seen  = new Set();
    const units = [];
    ids.forEach(id => {
      if (seen.has(id)) return;
      seen.add(id);
      const sid = spouseInGen(id, g);
      if (sid && !seen.has(sid)) {
        seen.add(sid);
        const m      = byId[id];
        const spouse = byId[sid];
        const order  =
          m?.gender === 'female' && spouse?.gender === 'male'
            ? [sid, id] : [id, sid];
        units.push({ type: 'couple', ids: order });
      } else {
        units.push({ type: 'single', ids: [id] });
      }
    });
    return units;
  }

  function unitWidth(unit) {
    return unit.type === 'couple' ? NODE_W * 2 + H_GAP : NODE_W;
  }

  function totalUnitsWidth(units) {
    if (!units.length) return 0;
    return (
      units.reduce((acc, u) => acc + unitWidth(u), 0) +
      Math.max(0, units.length - 1) * H_GAP
    );
  }

  function placeUnits(units, startX, y) {
    let x = startX;
    units.forEach((unit, i) => {
      if (unit.type === 'couple') {
        posMap[unit.ids[0]] = { x, y };
        posMap[unit.ids[1]] = { x: x + NODE_W + H_GAP, y };
      } else {
        posMap[unit.ids[0]] = { x, y };
      }
      x += unitWidth(unit) + (i < units.length - 1 ? H_GAP : 0);
    });
  }

  function resolveCollisions(g) {
    const ids = genGroups[g];
    if (!ids || ids.length < 2) return;
    const MIN_GAP = H_GAP * 0.8;
    const coupleOf = {};
    ids.forEach(id => {
      const sid = spouseInGen(id, g);
      if (sid) { coupleOf[id] = sid; coupleOf[sid] = id; }
    });
    for (let pass = 0; pass < 6; pass++) {
      const ltr = [...ids].sort((a, b) => (posMap[a]?.x || 0) - (posMap[b]?.x || 0));
      for (let i = 1; i < ltr.length; i++) {
        const prev = ltr[i - 1], curr = ltr[i];
        if (!posMap[prev] || !posMap[curr]) continue;
        const gap = posMap[curr].x - (posMap[prev].x + NODE_W);
        if (gap < MIN_GAP) {
          const shift = MIN_GAP - gap;
          posMap[curr].x += shift;
          const partner = coupleOf[curr];
          if (partner && posMap[partner] && posMap[partner].x > posMap[curr].x)
            posMap[partner].x += shift;
        }
      }
      const rtl = [...ltr].reverse();
      for (let i = 1; i < rtl.length; i++) {
        const prev = rtl[i - 1], curr = rtl[i];
        if (!posMap[prev] || !posMap[curr]) continue;
        const gap = posMap[prev].x - (posMap[curr].x + NODE_W);
        if (gap < MIN_GAP) {
          const shift = MIN_GAP - gap;
          posMap[curr].x -= shift;
          const partner = coupleOf[curr];
          if (partner && posMap[partner] && posMap[partner].x < posMap[curr].x)
            posMap[partner].x -= shift;
        }
      }
    }
  }

  function recenterParentAboveChildren(unit, g) {
    const y = g * (NODE_H + V_GAP);
    const childrenSet = new Set();
    unit.ids.forEach(pid => {
      (byId[pid]?.children || []).forEach(cId => {
        const cs = String(cId);
        if (memberIdSet.has(cs)) childrenSet.add(cs);
      });
    });
    if (!childrenSet.size) return;
    const childPos = [...childrenSet].map(c => posMap[c]).filter(Boolean);
    if (!childPos.length) return;
    const childMinX    = Math.min(...childPos.map(p => p.x));
    const childMaxX    = Math.max(...childPos.map(p => p.x + NODE_W));
    const childCenterX = (childMinX + childMaxX) / 2;
    if (unit.type === 'couple') {
      const startX = childCenterX - (NODE_W * 2 + H_GAP) / 2;
      posMap[unit.ids[0]] = { x: startX,                  y };
      posMap[unit.ids[1]] = { x: startX + NODE_W + H_GAP, y };
    } else {
      posMap[unit.ids[0]] = { x: childCenterX - NODE_W / 2, y };
    }
  }

  // ── Step 4: Initial placement ──────────────────────────────────────────────
  for (let g = 0; g <= maxGen; g++) {
    const ids = genGroups[g];
    if (!ids.length) continue;
    const units  = buildUnits(ids, g);
    const totalW = totalUnitsWidth(units);
    placeUnits(units, -totalW / 2, g * (NODE_H + V_GAP));
  }

  // ── Step 5: Bottom-up sibling centering ───────────────────────────────────
  const lockedByCouple = new Set();

  for (let g = maxGen; g >= 1; g--) {
    const ids = genGroups[g];
    const y   = g * (NODE_H + V_GAP);
    const seenSib       = new Set();
    const siblingGroups = [];

    ids.forEach(id => {
      if (seenSib.has(id)) return;
      const m       = byId[id];
      const parents = (m?.parents || [])
        .map(String)
        .filter(p => memberIdSet.has(p) && genMap[p] < g);
      if (!parents.length) { seenSib.add(id); return; }
      const siblings = ids.filter(s2 => {
        const sp2 = (byId[s2]?.parents || []).map(String);
        return parents.some(p => sp2.includes(p));
      });
      siblings.forEach(s => seenSib.add(s));
      siblingGroups.push({ parents, siblings });
    });

    siblingGroups.forEach(({ parents, siblings }) => {
      const active = siblings.filter(id => !lockedByCouple.has(id));
      if (!active.length) return;
      const units = buildUnits(active, g);
      units.sort((a, b) => {
        if (a.type === 'single' && b.type === 'couple') return -1;
        if (a.type === 'couple' && b.type === 'single') return  1;
        return 0;
      });
      units.forEach(u => {
        if (u.type === 'couple') u.ids.forEach(id => lockedByCouple.add(id));
      });
      const parentPos     = parents.map(p => posMap[p]).filter(Boolean);
      if (!parentPos.length) return;
      const parentMinX    = Math.min(...parentPos.map(p => p.x));
      const parentMaxX    = Math.max(...parentPos.map(p => p.x + NODE_W));
      const parentCenterX = (parentMinX + parentMaxX) / 2;
      placeUnits(units, parentCenterX - totalUnitsWidth(units) / 2, y);
    });

    resolveCollisions(g);
  }

  // ── Step 6: Top-down parent re-centering ──────────────────────────────────
  for (let g = 0; g < maxGen; g++) {
    const units = buildUnits(genGroups[g], g);
    units.forEach(unit => recenterParentAboveChildren(unit, g));
    resolveCollisions(g);
  }

  // ── Step 7: Final global collision sweep ──────────────────────────────────
  for (let g = 0; g <= maxGen; g++) resolveCollisions(g);

  // ── Step 8: Build ReactFlow nodes ─────────────────────────────────────────
  const nodes = members.map(m => ({
    id:       String(m._id),
    type:     'memberNode',
    position: posMap[String(m._id)] || { x: 0, y: 0 },
    data:     { member: m, onEdit: null, onDelete: null },
  }));

  // ── Step 9: Build edges ───────────────────────────────────────────────────
  const parentEdges = members.flatMap(m =>
    (m.children || [])
      .map(String)
      .filter(cId => memberIdSet.has(cId))
      .map(cId => ({
        id:        `parent-${String(m._id)}-${cId}`,
        source:    String(m._id),
        target:    cId,
        type:      'smoothstep',
        style:     { stroke: '#4ade80', strokeWidth: 1.8, opacity: 0.85 },
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
      id:           `spouse-${[String(m._id), String(m.spouse)].sort().join('-')}`,
      source:       String(m._id),
      target:       String(m.spouse),
      sourceHandle: 'right',
      targetHandle: 'left',
      type:         'straight',
      animated:     true,
      style:        { stroke: '#fbbf24', strokeWidth: 1.8, opacity: 0.85, strokeDasharray: '6 3' },
      label:        '💍',
      labelStyle:   { fontSize: 12, fontFamily: 'DM Sans, sans-serif' },
      labelBgStyle: { fill: 'transparent' },
    }));

  return { nodes, edges: [...parentEdges, ...spouseEdges] };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TreeCanvas({ members, onEdit, onDelete }) {
  const { dark } = useTheme();

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