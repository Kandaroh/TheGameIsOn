import { EventSpawnerService } from '../src/services/event-spawner.service';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('TEST FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

const spawner = new EventSpawnerService();
const specs = spawner.getSpecs().reduce((acc: any, s: any) => { acc[s.name] = s; return acc; }, {});

// helper to create nodes with a given event type count
function makeNodes(count: number, preset: Record<string, number>) {
  const nodes: any[] = [];
  nodes.push({ id: 'start', event: { type: 'start' } });
  let idx = 1;
  for (const [k, v] of Object.entries(preset)) {
    for (let i = 0; i < v; i++) {
      nodes.push({ id: `node-${idx++}`, event: { type: k } });
    }
  }
  while (nodes.length < count) {
    nodes.push({ id: `node-${idx++}`, event: { type: 'battle' } });
  }
  nodes.push({ id: 'end', event: { type: 'end' } });
  return nodes;
}

// Test: enforcing max caps
const presetTooMany = { 'rest': 5, 'hard battle': 6, 'new object': 0, 'power up': 0 };
let nodes = makeNodes(30, presetTooMany);
nodes = spawner.assignEvents(nodes);

assert(nodes.filter(n => n.event?.type === 'rest').length <= specs['rest'].max, 'rest exceeds max after assign');
assert(nodes.filter(n => n.event?.type === 'hard battle').length <= specs['hard battle'].max, 'hard battle exceeds max after assign');

// Test: enforcing min caps (promote)
const presetTooFew = { 'rest': 0, 'hard battle': 0, 'new object': 0, 'power up': 0 };
nodes = makeNodes(30, presetTooFew);
nodes = spawner.assignEvents(nodes);

for (const s of Object.values(specs)) {
  if (s.min > 0) {
    assert(nodes.filter(n => n.event?.type === s.name).length >= s.min, `${s.name} below min after assign`);
  }
}

console.log('All spawn-rule tests passed');
