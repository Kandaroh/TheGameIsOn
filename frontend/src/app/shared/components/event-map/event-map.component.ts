import { Component, Input, OnInit } from '@angular/core';

interface NodeDef { id: string; layout: { x: number; y: number }; }
interface EdgeDef { from: string; to: string }

@Component({
  selector: 'app-event-map',
  templateUrl: './event-map.component.html',
  styleUrls: ['./event-map.component.css']
})
export class EventMapComponent implements OnInit {
  @Input() nodes: NodeDef[] = [];
  @Input() edges: EdgeDef[] = [];

  displayNodes: NodeDef[] = [];
  displayEdges: EdgeDef[] = [];

  ngOnInit() {
    // Use provided inputs or fall back to scanning global state via DOM hooks in parent components.
    this.displayNodes = this.nodes.slice();
    this.displayEdges = this.edges.slice();
    this.avoidCrossings();
  }

  // Simple crossing detection and resolution: nudges x positions for nodes involved in crossings.
  avoidCrossings() {
    const getPos = (n: NodeDef) => ({ x: n.layout.x, y: n.layout.y });

    const lines = this.displayEdges.map(e => {
      const aNode = this.displayNodes.find(n => n.id === e.from)!;
      const bNode = this.displayNodes.find(n => n.id === e.to)!;
      return { e, a: getPos(aNode), b: getPos(bNode) };
    });

    function intersects(a:any,b:any,c:any,d:any) {
      const det = (p:any,q:any,r:any) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
      return (det(a,b,c) * det(a,b,d) < 0) && (det(c,d,a) * det(c,d,b) < 0);
    }

    let iterations = 0;
    while (iterations < 6) {
      let changed = false;
      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          const L1 = lines[i];
          const L2 = lines[j];
          if (intersects(L1.a, L1.b, L2.a, L2.b)) {
            // nudge x of the target node (prefer the 'to' node) to reduce crossing
            const target = this.displayNodes.find(n => n.id === L2.e.to) || this.displayNodes.find(n => n.id === L2.e.from);
            if (target) {
              target.layout.x = Math.max(5, Math.min(95, target.layout.x + (Math.random() > 0.5 ? 6 : -6)));
              changed = true;
            }
          }
        }
      }
      if (!changed) break;
      // recompute lines
      for (let k = 0; k < lines.length; k++) {
        const a = this.displayNodes.find(n => n.id === lines[k].e.from)!;
        const b = this.displayNodes.find(n => n.id === lines[k].e.to)!;
        lines[k].a = { x: a.layout.x, y: a.layout.y };
        lines[k].b = { x: b.layout.x, y: b.layout.y };
      }
      iterations++;
    }
  }

  toPxX(xPercent:number) { return xPercent + '%'; }
  toPxY(yPercent:number) { return yPercent + '%'; }

  getX(id: string) {
    const n = this.displayNodes.find(x => x.id === id);
    return (n?.layout?.x ?? 0);
  }

  getY(id: string) {
    const n = this.displayNodes.find(x => x.id === id);
    return (n?.layout?.y ?? 0);
  }
}
