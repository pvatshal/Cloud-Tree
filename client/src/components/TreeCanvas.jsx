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
const H_GAP  = 80;
const V_GAP  = 110;
const MIN_GAP = 56; // minimum px between any two nodes

const nodeTypes = {
  memberNode: ({ data }) => {
    if (!data?.member) return null;
    return <MemberCard member={data.member} onEdit={data.onEdit} onDelete={data.onDelete} />;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
function buildLayout(members) {
  if (!members.length) return { nodes: [], edges: [] };

  const byId = {};
  members.forEach(m => { byId[String(m._id)] = m; });
  const allIds = new Set(members.map(m => String(m._id)));

  const sid = (m) => m?.spouse ? String(m.spouse) : null;
  const validParents = (m) => (m.parents || []).map(String).filter(p => allIds.has(p));

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 1 — GENERATION ASSIGNMENT
  // ════════════════════════════════════════════════════════════════════════════

  const gen = {};   // id → generation number

  // STEP 1 — BFS (max-gen wins: a member gets the deepest gen reachable)
  const roots = members.filter(m => validParents(m).length === 0);
  if (!roots.length) roots.push(members[0]);

  const q = roots.map(r => ({ id: String(r._id), g: 0 }));
  while (q.length) {
    const { id, g } = q.shift();
    if (gen[id] !== undefined && gen[id] >= g) continue;
    gen[id] = g;
    (byId[id]?.children || []).forEach(c => {
      const cid = String(c);
      if (allIds.has(cid)) q.push({ id: cid, g: g + 1 });
    });
  }

  // STEP 2 — Propagate spouse gens (fill in undefined spouses)
  let dirty = true;
  while (dirty) {
    dirty = false;
    members.forEach(m => {
      const a = String(m._id), b = sid(m);
      if (!b || !allIds.has(b)) return;
      if (gen[a] !== undefined && gen[b] === undefined) { gen[b] = gen[a]; dirty = true; }
      else if (gen[b] !== undefined && gen[a] === undefined) { gen[a] = gen[b]; dirty = true; }
    });
  }

  // ── KEY FIX: spouse RECONCILIATION before parent-pulling ──────────────────
  // STEP 3 — Reconcile mismatched spouse gens (use deeper gen)
  // This MUST run before parent-pulling so Drashti is correctly promoted to
  // Vatsal's gen BEFORE we try to pull Arpan+Kinnari down.
  dirty = true;
  while (dirty) {
    dirty = false;
    members.forEach(m => {
      const a = String(m._id), b = sid(m);
      if (!b || !allIds.has(b)) return;
      if (gen[a] === undefined || gen[b] === undefined) return;
      if (gen[a] !== gen[b]) {
        const deeper = Math.max(gen[a], gen[b]);
        if (gen[a] !== deeper) { gen[a] = deeper; dirty = true; }
        if (gen[b] !== deeper) { gen[b] = deeper; dirty = true; }
      }
    });
  }

  // STEP 4 — Pull parents down so they are exactly one gen above their children
  // (Now Drashti is at Vatsal's gen, so Arpan+Kinnari get pulled correctly)
  dirty = true;
  while (dirty) {
    dirty = false;
    members.forEach(m => {
      const id = String(m._id);
      const childGens = (m.children || [])
        .map(String).filter(c => allIds.has(c) && gen[c] !== undefined)
        .map(c => gen[c]);
      if (!childGens.length) return;
      const need = Math.min(...childGens) - 1;
      if (gen[id] === undefined || gen[id] < need) { gen[id] = need; dirty = true; }
    });
  }

  // STEP 5 — Re-propagate spouse gens after pulling (fill & reconcile)
  dirty = true;
  while (dirty) {
    dirty = false;
    members.forEach(m => {
      const a = String(m._id), b = sid(m);
      if (!b || !allIds.has(b)) return;
      if (gen[a] !== undefined && gen[b] === undefined) { gen[b] = gen[a]; dirty = true; }
      else if (gen[b] !== undefined && gen[a] === undefined) { gen[a] = gen[b]; dirty = true; }
      else if (gen[a] !== undefined && gen[b] !== undefined && gen[a] !== gen[b]) {
        const deeper = Math.max(gen[a], gen[b]);
        if (gen[a] !== deeper) { gen[a] = deeper; dirty = true; }
        if (gen[b] !== deeper) { gen[b] = deeper; dirty = true; }
      }
    });
  }

  // Assign unvisited → 0, normalise so min = 0
  members.forEach(m => { if (gen[String(m._id)] === undefined) gen[String(m._id)] = 0; });
  const minG = Math.min(...Object.values(gen));
  if (minG < 0) members.forEach(m => { gen[String(m._id)] -= minG; });

  const maxG = Math.max(...Object.values(gen));
  const byGen = {};
  for (let g = 0; g <= maxG; g++) byGen[g] = [];
  members.forEach(m => byGen[gen[String(m._id)]].push(String(m._id)));

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 2 — LAYOUT
  // ════════════════════════════════════════════════════════════════════════════

  const pos = {};   // id → {x, y}

  // Helpers ──────────────────────────────────────────────────────────────────

  function spouseAt(id, g) {
    const s = sid(byId[id]);
    return (s && allIds.has(s) && gen[s] === g) ? s : null;
  }

  // ── KEY FIX: only form couples with members inside the given id set ────────
  // Prevents a cross-family spouse from being pulled into the sibling group.
  function makeUnits(ids) {
    const idSet = new Set(ids);
    const seen  = new Set();
    const units = [];
    ids.forEach(id => {
      if (seen.has(id)) return;
      seen.add(id);
      const s = spouseAt(id, gen[id]);
      if (s && !seen.has(s) && idSet.has(s)) {
        seen.add(s);
        const mo = byId[id], so = byId[s];
        const order = (mo?.gender === 'female' && so?.gender === 'male') ? [s, id] : [id, s];
        units.push({ type: 'couple', ids: order });
      } else {
        units.push({ type: 'single', ids: [id] });
      }
    });
    return units;
  }

  function uw(u) { return u.type === 'couple' ? NODE_W * 2 + H_GAP : NODE_W; }
  function totalW(units) {
    return units.reduce((s, u) => s + uw(u), 0) + Math.max(0, units.length - 1) * H_GAP;
  }

  function placeUnits(units, startX, y) {
    let x = startX;
    units.forEach((u, i) => {
      if (u.type === 'couple') {
        pos[u.ids[0]] = { x, y };
        pos[u.ids[1]] = { x: x + NODE_W + H_GAP, y };
      } else {
        pos[u.ids[0]] = { x, y };
      }
      if (i < units.length - 1) x += uw(u) + H_GAP;
    });
  }

  // Bidirectional collision fix, couples move atomically
  function fixCollisions(g) {
    const ids = byGen[g];
    if (!ids || ids.length < 2) return;

    const partnerOf = {};
    ids.forEach(id => {
      const s = spouseAt(id, g);
      if (s) { partnerOf[id] = s; partnerOf[s] = id; }
    });

    for (let pass = 0; pass < 10; pass++) {
      const ltr = [...ids].sort((a, b) => (pos[a]?.x ?? 0) - (pos[b]?.x ?? 0));

      // left→right: push right
      for (let i = 1; i < ltr.length; i++) {
        const [p, c] = [ltr[i - 1], ltr[i]];
        if (!pos[p] || !pos[c]) continue;
        const gap = pos[c].x - (pos[p].x + NODE_W);
        if (gap < MIN_GAP) {
          const d = MIN_GAP - gap;
          pos[c].x += d;
          const pt = partnerOf[c];
          if (pt && pos[pt] && pos[pt].x > pos[c].x) pos[pt].x += d;
        }
      }
      // right→left: push left
      for (let i = ltr.length - 2; i >= 0; i--) {
        const [n, c] = [ltr[i + 1], ltr[i]];
        if (!pos[n] || !pos[c]) continue;
        const gap = pos[n].x - (pos[c].x + NODE_W);
        if (gap < MIN_GAP) {
          const d = MIN_GAP - gap;
          pos[c].x -= d;
          const pt = partnerOf[c];
          if (pt && pos[pt] && pos[pt].x < pos[c].x) pos[pt].x -= d;
        }
      }
    }
  }

  // Center a parent unit above its children's bounding box
  function recenterAboveChildren(unit, g) {
    const y       = g * (NODE_H + V_GAP);
    const childIds = new Set();
    unit.ids.forEach(pid => {
      (byId[pid]?.children || []).forEach(c => {
        const cs = String(c);
        if (allIds.has(cs)) childIds.add(cs);
      });
    });
    if (!childIds.size) return;
    const cpos = [...childIds].map(c => pos[c]).filter(Boolean);
    if (!cpos.length) return;
    const cx = (Math.min(...cpos.map(p => p.x)) + Math.max(...cpos.map(p => p.x + NODE_W))) / 2;
    if (unit.type === 'couple') {
      const sx = cx - (NODE_W * 2 + H_GAP) / 2;
      pos[unit.ids[0]] = { x: sx, y };
      pos[unit.ids[1]] = { x: sx + NODE_W + H_GAP, y };
    } else {
      pos[unit.ids[0]] = { x: cx - NODE_W / 2, y };
    }
  }

  // ── LAYOUT A — initial centred placement ──────────────────────────────────
  for (let g = 0; g <= maxG; g++) {
    if (!byGen[g].length) continue;
    const units = makeUnits(byGen[g]);
    placeUnits(units, -totalW(units) / 2, g * (NODE_H + V_GAP));
  }

  // ── LAYOUT B — bottom-up sibling centering ────────────────────────────────
  // Singles go LEFT of couples (prevents a single sibling between a married pair)
  const coupleMembers = new Set();

  for (let g = maxG; g >= 1; g--) {
    const ids = byGen[g];
    const y   = g * (NODE_H + V_GAP);
    const visited = new Set();
    const groups  = [];

    ids.forEach(id => {
      if (visited.has(id)) return;
      const pids = validParents(byId[id]).filter(p => gen[p] < g);
      if (!pids.length) { visited.add(id); return; }
      // Siblings share at least one parent
      const sibs = ids.filter(s => {
        const sp = validParents(byId[s]).filter(p => gen[p] < g);
        return pids.some(p => sp.includes(p));
      });
      sibs.forEach(s => visited.add(s));
      groups.push({ pids, sibs });
    });

    groups.forEach(({ pids, sibs }) => {
      const active = sibs.filter(id => !coupleMembers.has(id));
      if (!active.length) return;

      const units = makeUnits(active);
      units.sort((a, b) =>
        a.type === b.type ? 0 : a.type === 'single' ? -1 : 1
      );
      units.forEach(u => {
        if (u.type === 'couple') u.ids.forEach(id => coupleMembers.add(id));
      });

      const pp   = pids.map(p => pos[p]).filter(Boolean);
      if (!pp.length) return;
      const pcx  = (Math.min(...pp.map(p => p.x)) + Math.max(...pp.map(p => p.x + NODE_W))) / 2;
      placeUnits(units, pcx - totalW(units) / 2, y);
    });

    fixCollisions(g);
  }

  // ── LAYOUT C — cross-family couple adhesion ───────────────────────────────
  // Married pairs from different sibling groups get pulled adjacent.
  const seenPairs = new Set();
  members.forEach(m => {
    const a = String(m._id), b = sid(m);
    if (!b || !allIds.has(b)) return;
    const key = [a, b].sort().join('|');
    if (seenPairs.has(key)) return;
    seenPairs.add(key);

    const g = gen[a];
    if (gen[b] !== g || !pos[a] || !pos[b]) return;

    // Already adjacent?
    if (Math.abs(Math.abs(pos[a].x - pos[b].x) - (NODE_W + H_GAP)) < 2) return;

    const mo = byId[a], so = byId[b];
    const [leftId, rightId] =
      mo?.gender === 'female' && so?.gender === 'male' ? [b, a] : [a, b];

    const aHasParents = validParents(mo).length > 0;
    const bHasParents = validParents(so).length > 0;

    let cx;
    if (aHasParents && !bHasParents)       cx = pos[a].x + NODE_W / 2;
    else if (bHasParents && !aHasParents)  cx = pos[b].x + NODE_W / 2;
    else                                   cx = (pos[a].x + pos[b].x + NODE_W) / 2;

    const y = g * (NODE_H + V_GAP);
    pos[leftId]  = { x: cx - NODE_W - H_GAP / 2, y };
    pos[rightId] = { x: cx + H_GAP / 2, y };
  });

  // After adhesion, fix collisions at all gens
  for (let g = 0; g <= maxG; g++) fixCollisions(g);

  // ── LAYOUT D — multiple rounds of top-down re-centering ───────────────────
  // Each round: re-center parents above final child positions, then fix
  // collisions. Run 3 rounds so cascading families converge.
  for (let round = 0; round < 3; round++) {
    for (let g = 0; g < maxG; g++) {
      const units = makeUnits(byGen[g]);
      units.forEach(u => recenterAboveChildren(u, g));
      fixCollisions(g);
    }
    // Also tighten children toward parent after parents moved
    for (let g = maxG; g >= 1; g--) {
      const ids = byGen[g];
      const visited = new Set();
      ids.forEach(id => {
        if (visited.has(id)) return;
        const pids = validParents(byId[id]).filter(p => gen[p] < g);
        if (!pids.length) { visited.add(id); return; }
        const sibs = ids.filter(s => {
          const sp = validParents(byId[s]).filter(p => gen[p] < g);
          return pids.some(p => sp.includes(p));
        });
        sibs.forEach(s => visited.add(s));

        const active = sibs.filter(id => !coupleMembers.has(id) ||
          (coupleMembers.has(id) && sibs.includes(id)));
        if (!active.length) return;

        const pp  = pids.map(p => pos[p]).filter(Boolean);
        if (!pp.length) return;
        const pcx = (Math.min(...pp.map(p => p.x)) + Math.max(...pp.map(p => p.x + NODE_W))) / 2;
        const units = makeUnits(active);
        units.sort((a, b) => a.type === b.type ? 0 : a.type === 'single' ? -1 : 1);
        placeUnits(units, pcx - totalW(units) / 2, g * (NODE_H + V_GAP));
      });
      fixCollisions(g);
    }

    // Re-apply couple adhesion after each round
    const seen2 = new Set();
    members.forEach(m => {
      const a = String(m._id), b = sid(m);
      if (!b || !allIds.has(b)) return;
      const key = [a, b].sort().join('|');
      if (seen2.has(key)) return;
      seen2.add(key);
      const g = gen[a];
      if (gen[b] !== g || !pos[a] || !pos[b]) return;
      if (Math.abs(Math.abs(pos[a].x - pos[b].x) - (NODE_W + H_GAP)) < 2) return;
      const mo = byId[a], so = byId[b];
      const [leftId, rightId] =
        mo?.gender === 'female' && so?.gender === 'male' ? [b, a] : [a, b];
      const aHasParents = validParents(mo).length > 0;
      const bHasParents = validParents(so).length > 0;
      let cx;
      if (aHasParents && !bHasParents)      cx = pos[a].x + NODE_W / 2;
      else if (bHasParents && !aHasParents) cx = pos[b].x + NODE_W / 2;
      else                                  cx = (pos[a].x + pos[b].x + NODE_W) / 2;
      const y = g * (NODE_H + V_GAP);
      pos[leftId]  = { x: cx - NODE_W - H_GAP / 2, y };
      pos[rightId] = { x: cx + H_GAP / 2, y };
    });
    for (let g = 0; g <= maxG; g++) fixCollisions(g);
  }

  // ── Final sweep ───────────────────────────────────────────────────────────
  for (let g = 0; g <= maxG; g++) fixCollisions(g);

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 3 — BUILD REACTFLOW OUTPUT
  // ════════════════════════════════════════════════════════════════════════════

  const nodes = members.map(m => ({
    id:       String(m._id),
    type:     'memberNode',
    position: pos[String(m._id)] || { x: 0, y: 0 },
    data:     { member: m, onEdit: null, onDelete: null },
  }));

  const parentEdges = members.flatMap(m =>
    (m.children || []).map(String).filter(c => allIds.has(c)).map(c => ({
      id:        `p-${String(m._id)}-${c}`,
      source:    String(m._id),
      target:    c,
      type:      'smoothstep',
      style:     { stroke: '#4ade80', strokeWidth: 1.8, opacity: 0.85 },
      markerEnd: { type: 'arrowclosed', color: '#4ade80', width: 16, height: 16 },
    }))
  );

  const seenSpouse = new Set();
  const spouseEdges = members
    .filter(m => m.spouse && allIds.has(String(m.spouse)))
    .filter(m => {
      const key = [String(m._id), String(m.spouse)].sort().join('|');
      if (seenSpouse.has(key)) return false;
      seenSpouse.add(key);
      return true;
    })
    .map(m => ({
      id:           `s-${[String(m._id), String(m.spouse)].sort().join('|')}`,
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

// ─────────────────────────────────────────────────────────────────────────────
export default function TreeCanvas({ members, onEdit, onDelete }) {
  const { dark } = useTheme();

  const inject = (nodes) =>
    nodes.map(n => ({ ...n, data: { ...n.data, onEdit, onDelete } }));

  const { nodes: initN, edges: initE } = useMemo(() => buildLayout(members), [members]);

  const [nodes, setNodes, onNodesChange] = useNodesState(inject(initN));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initE);
  const onConnect = useCallback(p => setEdges(e => addEdge(p, e)), []);

  useEffect(() => {
    const { nodes: n, edges: e } = buildLayout(members);
    setNodes(inject(n));
    setEdges(e);
  }, [members, onEdit, onDelete]);

  return (
    <div style={{ width: '100vw', height: 'calc(100vh - 64px)' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.3 }} minZoom={0.15}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          nodeColor={n => {
            const m = members.find(m => String(m._id) === n.id);
            return { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6' }[m?.gender] || '#4ade80';
          }}
          maskColor={dark ? 'rgba(0,0,0,0.6)' : 'rgba(240,253,244,0.7)'}
          style={{ background: dark ? '#0d1f13' : '#f0fdf4' }}
        />
        <Controls showInteractive={false} />
        <Background
          color={dark ? '#1e3a2a' : '#bbf7d0'} gap={24} size={1.5}
          style={{ opacity: dark ? 0.4 : 0.7 }}
        />
      </ReactFlow>
    </div>
  );
}