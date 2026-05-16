const MAT = {
  wood: new THREE.MeshStandardMaterial({color:0x8B5E3C,roughness:0.8,metalness:0.0}),
  woodDark: new THREE.MeshStandardMaterial({color:0x5C3D1E,roughness:0.85,metalness:0.0}),
  metal: new THREE.MeshStandardMaterial({color:0x607080,roughness:0.3,metalness:0.8}),
  metalShiny: new THREE.MeshStandardMaterial({color:0x90a0b0,roughness:0.15,metalness:0.95}),
  thread: new THREE.MeshStandardMaterial({color:0x00e5ff,roughness:0.9,metalness:0.0}),
  weftThread: new THREE.MeshStandardMaterial({color:0x76ff03,roughness:0.9,metalness:0.0}),
  shuttle: new THREE.MeshStandardMaterial({color:0xd4a843,roughness:0.5,metalness:0.3}),
  fabric: new THREE.MeshStandardMaterial({color:0x1a3a5c,roughness:0.95,metalness:0.0,side:THREE.DoubleSide}),
};

function box(w,h,d,mat,x,y,z,castS=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z); m.castShadow=castS; m.receiveShadow=true;
  return m;
}

function cyl(rt,rb,h,seg,mat,x,y,z){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true;
  return m;
}

function buildLoom() {
  const loomGroup = new THREE.Group();

  function buildSideFrame(xSign){
    const g=new THREE.Group();
    g.add(box(0.18,5,0.18,MAT.woodDark,0,2.5,0));
    g.add(box(0.18,5,0.18,MAT.woodDark,0,2.5,2.6));
    g.add(box(0.14,0.14,2.6,MAT.wood,0,4.6,1.3));
    g.add(box(0.14,0.14,2.6,MAT.wood,0,3.0,1.3));
    g.add(box(0.14,0.14,2.6,MAT.wood,0,1.4,1.3));
    g.add(box(0.14,0.14,2.6,MAT.wood,0,0.3,1.3));
    g.add(box(0.14,0.14,2.6,MAT.woodDark,0,0.08,1.3));
    g.add(cyl(0.10,0.13,0.5,8,MAT.woodDark,0,0.25,0));
    g.add(cyl(0.10,0.13,0.5,8,MAT.woodDark,0,0.25,2.6));
    g.position.x = xSign*2.4;
    return g;
  }
  loomGroup.add(buildSideFrame(-1));
  loomGroup.add(buildSideFrame(1));

  loomGroup.add(box(4.8,0.14,0.14,MAT.woodDark,0,0.08,0));
  loomGroup.add(box(4.8,0.14,0.14,MAT.woodDark,0,0.08,2.6));
  loomGroup.add(box(4.8,0.14,2.6,MAT.woodDark,0,0.06,1.3));

  loomGroup.add(box(5.0,0.22,0.22,MAT.wood,0,4.6,0));
  loomGroup.add(box(5.0,0.22,0.22,MAT.woodDark,0,4.6,2.6));

  const clothBeamGroup = new THREE.Group();
  clothBeamGroup.add(cyl(0.14,0.14,4.8,16,MAT.metalShiny,0,0,0));
  clothBeamGroup.position.set(0,0.45,0.2);
  loomGroup.add(clothBeamGroup);

  const warpBeamGroup = new THREE.Group();
  warpBeamGroup.add(cyl(0.16,0.16,4.8,16,MAT.metalShiny,0,0,0));
  warpBeamGroup.position.set(0,0.5,2.4);
  loomGroup.add(warpBeamGroup);

  function buildHeddleFrame(zOff,color){
    const g=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({color,roughness:0.4,metalness:0.6});
    g.add(box(3.8,0.1,0.06,mat,0,0.4,0));   
    g.add(box(3.8,0.1,0.06,mat,0,-0.4,0));  
    g.add(box(0.08,0.8,0.06,mat,-1.85,0,0)); 
    g.add(box(0.08,0.8,0.06,mat,1.85,0,0));  
    for(let i=-1.7;i<=1.7;i+=0.18){
      const wireMat=new THREE.MeshStandardMaterial({color:0x88aabb,roughness:0.5,metalness:0.8});
      g.add(box(0.01,0.65,0.02,wireMat,i,0,0));
    }
    g.position.set(0,2.5,zOff);
    return g;
  }
  loomGroup.add(buildHeddleFrame(1.05,0x4488aa));
  loomGroup.add(buildHeddleFrame(1.45,0x2266aa));

  const reedGroup = new THREE.Group();
  const reedFrameMat=new THREE.MeshStandardMaterial({color:0x7a6040,roughness:0.7,metalness:0.1});
  reedGroup.add(box(4.2,0.12,0.12,reedFrameMat,0,0.6,0));  
  reedGroup.add(box(4.2,0.12,0.12,reedFrameMat,0,-0.6,0)); 
  reedGroup.add(box(0.1,1.2,0.1,reedFrameMat,-2.05,0,0));
  reedGroup.add(box(0.1,1.2,0.1,reedFrameMat,2.05,0,0));
  for(let i=-2.0;i<=2.0;i+=0.12){
    const dent=new THREE.Mesh(new THREE.BoxGeometry(0.02,1.1,0.04),
      new THREE.MeshStandardMaterial({color:0xaaaaaa,roughness:0.3,metalness:0.9}));
    dent.position.set(i,0,0);
    reedGroup.add(dent);
  }
  reedGroup.position.set(0,2.5,1.25);
  loomGroup.add(reedGroup);

  const fabricGroup = new THREE.Group();
  const fabricMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6,1.8,20,20),
    new THREE.MeshStandardMaterial({
      color:0x1a3a5c,roughness:0.95,metalness:0.0,
      side:THREE.DoubleSide,
      wireframe:false
    })
  );
  fabricMesh.rotation.x=-Math.PI/2+0.3;
  fabricMesh.position.set(0,1.1,0.6);
  fabricGroup.add(fabricMesh);

  for(let r=0;r<6;r++){
    const weftRow=new THREE.Mesh(
      new THREE.CylinderGeometry(0.006,0.006,3.6,4),
      MAT.weftThread.clone()
    );
    weftRow.rotation.z=Math.PI/2;
    weftRow.position.set(0, 0.9+r*0.12, 0.45+r*0.07);
    fabricGroup.add(weftRow);
  }
  loomGroup.add(fabricGroup);

  for(let t=0;t<4;t++){
    loomGroup.add(box(0.7,0.06,0.8,MAT.woodDark, -1.5+t*1.0, 0.2, 1.8));
  }

  return loomGroup;
}

function createShuttle() {
  const shuttleGroup = new THREE.Group();
  const shuttleBody=new THREE.Mesh(
    new THREE.CylinderGeometry(0.06,0.06,1.2,6),
    MAT.shuttle
  );
  shuttleBody.rotation.z=Math.PI/2;
  const sPt1=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.22,6),MAT.shuttle);
  sPt1.rotation.z=-Math.PI/2; sPt1.position.x=0.7;
  const sPt2=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.22,6),MAT.shuttle);
  sPt2.rotation.z=Math.PI/2; sPt2.position.x=-0.7;
  shuttleGroup.add(shuttleBody,sPt1,sPt2);
  const bobbinMat=new THREE.MeshStandardMaterial({color:0x00e5ff,roughness:0.8});
  const bobbin=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.5,8),bobbinMat);
  bobbin.rotation.z=Math.PI/2; shuttleGroup.add(bobbin);
  return shuttleGroup;
}

function createWarpThreads(count, width, depth) {
  const warpGroup = new THREE.Group();
  for(let i=-1.8;i<=1.8;i+=0.18){
    const warpMat=MAT.thread.clone();
    const warp=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,4.3,4),warpMat);
    warp.position.set(i,2.5,1.3);
    warpGroup.add(warp);
  }
  return warpGroup;
}

window.buildLoom = buildLoom;
window.createShuttle = createShuttle;
window.createWarpThreads = createWarpThreads;
