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

  // Step 3: Assign any remaining unvisited to gen 0
  members.forEach(m => {
    if (genMap[String(m._id)] === undefined) genMap[String(m._id)] = 0;
  });

  const maxGen = Math.max(...Object.values(genMap));
  const genGroups = {};
  for (let g = 0; g <= maxGen; g++) genGroups[g] = [];
  members.forEach(m => genGroups[genMap[String(m._id)]].push(String(m._id)));

  const posMap = {};

  // ── Helpers ───────────────────────────────────────────────────────────────
  function unitWidth(unit) {
    return unit.type === 'couple' ? NODE_W * 2 + H_GAP : NODE_W;
  }

  // Build couple-units from a list of IDs in generation g
  function buildUnits(ids, g) {
    const seen = new Set();
    const units = [];
    ids.forEach(id => {
      if (seen.has(id)) return;
      seen.add(id);
      const m = byId[id];
      const sid = m?.spouse ? String(m.spouse) : null;
      if (sid && genMap[sid] === g && !seen.has(sid)) {
        seen.add(sid);
        const spouse = byId[sid];
        // Male first, female second
        if (m.gender === 'female' && spouse?.gender === 'male') {
          units.push({ type: 'couple', ids: [sid, id] });
        } else {
          units.push({ type: 'couple', ids: [id, sid] });
        }
      } else {
        units.push({ type: 'single', ids: [id] });
      }
    });
    return units;
  }

  // Place units starting at startX on row y
  function placeUnits(units, startX, y) {
    let x = startX;
    units.forEach((unit, i) => {
      if (unit.type === 'couple') {
        posMap[unit.ids[0]] = { x, y };
        posMap[unit.ids[1]] = { x: x + NODE_W + H_GAP, y };
      } else {
        posMap[unit.ids[0]] = { x, y };
      }
      x += unitWidth(unit) + (i < units.length - 1 ? H_GAP * 1.5 : 0);
    });
  }

  function totalUnitsWidth(units) {
    return units.reduce((acc, u, i) =>
      acc + unitWidth(u) + (i < units.length - 1 ? H_GAP * 1.5 : 0), 0);
  }

  // Step 4: Initial layout — place couple-units side by side per generation
  for (let g = 0; g <= maxGen; g++) {
    const ids = genGroups[g];
    if (!ids.length) continue;
    const units = buildUnits(ids, g);
    const totalW = totalUnitsWidth(units);
    const y = g * (NODE_H + V_GAP);
    placeUnits(units, -totalW / 2, y);
  }

  // Step 5: Re-center children (as atomic couple-units) under their parents
  // Singles go LEFT of couples so a single sibling never sits between a married couple
  const repositionedAsCouple = new Set();

  for (let g = maxGen; g >= 1; g--) {
    const ids = genGroups[g];
    const seenSibGroup = new Set();
    const siblingGroups = [];

    ids.forEach(id => {
      if (seenSibGroup.has(id)) return;
      const m = byId[id];
      const parents = (m?.parents || []).map(String).filter(p => memberIdSet.has(p));
      if (!parents.length) return;

      const siblings = ids.filter(sid => {
        const sp = (byId[sid]?.parents || []).map(String);
        return parents.some(p => sp.includes(p));
      });
      siblings.forEach(s => seenSibGroup.add(s));
      siblingGroups.push({ parents, siblings });
    });

    siblingGroups.forEach(({ parents, siblings }) => {
      // Skip siblings already locked in as part of a couple from another sibling group
      const activeSiblings = siblings.filter(id => !repositionedAsCouple.has(id));
      if (!activeSiblings.length) return;

      // Build couple-units — a sibling's spouse may be from a different family
      const units = buildUnits(activeSiblings, g);

      // Sort: singles LEFT, couples RIGHT
      // This prevents a single sibling from landing between a married couple
      units.sort((a, b) => {
        if (a.type === 'single' && b.type === 'couple') return -1;
        if (a.type === 'couple' && b.type === 'single') return 1;
        return 0;
      });

      // Lock couple members so they aren't repositioned by another sibling group
      units.forEach(u => {
        if (u.type === 'couple') {
          repositionedAsCouple.add(u.ids[0]);
          repositionedAsCouple.add(u.ids[1]);
        }
      });

      const parentPos = parents.map(p => posMap[p]).filter(Boolean);
      if (!parentPos.length) return;

      const parentCenterX =
        parentPos.reduce((s, p) => s + p.x + NODE_W / 2, 0) / parentPos.length;

      const totalW = totalUnitsWidth(units);
      const startX = parentCenterX - totalW / 2;
      const y = g * (NODE_H + V_GAP);

      placeUnits(units, startX, y);
    });
  }

  // Step 5b: Re-center parent couples above their children's final positions
  // This ensures e.g. Arpan+Kinnari slide above Drashti's final spot
  for (let g = 0; g < maxGen; g++) {
    const ids = genGroups[g];
    const seenParent = new Set();

    ids.forEach(id => {
      if (seenParent.has(id)) return;
      seenParent.add(id);

      const m = byId[id];
      const sid = m?.spouse ? String(m.spouse) : null;
      const isCouple = sid && genMap[sid] === g && memberIdSet.has(sid);
      if (isCouple) seenParent.add(sid);

      // Collect all children of this parent (or couple)
      const parentIds = isCouple ? [id, sid] : [id];
      const childrenSet = new Set();
      parentIds.forEach(pid => {
        (byId[pid]?.children || []).forEach(cId => {
          const cStr = String(cId);
          if (memberIdSet.has(cStr)) childrenSet.add(cStr);
        });
      });

      if (!childrenSet.size) return;

      const childPos = [...childrenSet].map(c => posMap[c]).filter(Boolean);
      if (!childPos.length) return;

      const childMinX = Math.min(...childPos.map(p => p.x));
      const childMaxX = Math.max(...childPos.map(p => p.x + NODE_W));
      const childCenterX = (childMinX + childMaxX) / 2;
      const y = g * (NODE_H + V_GAP);

      if (isCouple) {
        const coupleW = NODE_W * 2 + H_GAP;
        const startX = childCenterX - coupleW / 2;
        const spouse = byId[sid];
        if (m.gender === 'female' && spouse?.gender === 'male') {
          posMap[sid] = { x: startX, y };
          posMap[id]  = { x: startX + NODE_W + H_GAP, y };
        } else {
          posMap[id]  = { x: startX, y };
          posMap[sid] = { x: startX + NODE_W + H_GAP, y };
        }
      } else {
        posMap[id] = { x: childCenterX - NODE_W / 2, y };
      }
    });
  }

  // Step 6: Build ReactFlow nodes
  const nodes = members.map(m => ({
    id: String(m._id),
    type: 'memberNode',
    position: posMap[String(m._id)] || { x: 0, y: 0 },
    data: { member: m, onEdit: null, onDelete: null },
  }));

  // Step 7: Build edges
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