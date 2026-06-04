const http = require('http');

function intersects(a,b,c,d){
  const det=(p,q,r)=> (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return (det(a,b,c)*det(a,b,d)<0) && (det(c,d,a)*det(c,d,b)<0);
}

function check(graph){
  const nodes = graph.nodes.reduce((m,n)=>{m[n.id]=n;return m},{});
  const edges = graph.edges.map(e=>({a:nodes[e.from], b:nodes[e.to]})).filter(e=>e.a && e.b);
  for(let i=0;i<edges.length;i++){
    for(let j=i+1;j<edges.length;j++){
      const e1=edges[i], e2=edges[j];
      // ignore shared endpoints
      if(e1.a.id===e2.a.id || e1.a.id===e2.b.id || e1.b.id===e2.a.id || e1.b.id===e2.b.id) continue;
      if(intersects({x:e1.a.layout.x,y:e1.a.layout.y},{x:e1.b.layout.x,y:e1.b.layout.y},{x:e2.a.layout.x,y:e2.a.layout.y},{x:e2.b.layout.x,y:e2.b.layout.y})){
        console.error('Crossing detected between', e1.a.id, e1.b.id, 'and', e2.a.id, e2.b.id);
        process.exit(2);
      }
    }
  }
  console.log('No crossings detected');
}

http.get('http://localhost:4000/api/game/state', res=>{
  let data='';
  res.on('data', chunk=> data+=chunk);
  res.on('end', ()=>{
    try{
      const state=JSON.parse(data);
      check(state.graph);
    }catch(e){
      console.error('Error parsing state', e);
      process.exit(3);
    }
  });
}).on('error', e=>{ console.error('HTTP error', e); process.exit(4); });
