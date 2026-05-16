import re

with open(r'c:\Users\sushm\OneDrive\Desktop\llm_engineering-main\Handloom-Twin\Fiware\frntend\wev2.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('const WARP_COUNT = 50;', 'const WARP_COUNT = 15;')
html = html.replace('const SPACING = 0.08;', 'const SPACING = 0.25;')
html = html.replace('const THREAD_RADIUS = 0.01;', 'const THREAD_RADIUS = 0.02;')

if 'texture_b64.js' not in html:
    html = html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script src="texture_b64.js"></script>')

if 'sharedPrintedMaterial' not in html:
    html = html.replace('const pastWefts = [];', 'const pastWefts = [];\nconst textureLoader = new THREE.TextureLoader();\nconst sareeTex = textureLoader.load(sareeTextureB64);\nsareeTex.wrapS = THREE.RepeatWrapping;\nsareeTex.wrapT = THREE.RepeatWrapping;\nconst sharedPrintedMaterial = new THREE.MeshStandardMaterial({map: sareeTex, side: THREE.DoubleSide, roughness: 0.6});')

pattern = re.compile(r'const structuralPatterns = \[.*?\];', re.DOTALL)
replacement = '''const structuralPatterns = [
    [
        [1,1,0,0,1,1,0,0,1,1,0,0,1,1,0],
        [0,1,1,0,0,1,1,0,0,1,1,0,0,1,1],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1],
        [1,0,0,1,1,0,0,1,1,0,0,1,1,0,0]
    ],
    [
        [1,1,0,0,1,1,0,0,1,1,0,0,1,1,0],
        [1,1,0,0,1,1,0,0,1,1,0,0,1,1,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1]
    ]
];'''
html = pattern.sub(replacement, html)

tube_code = '''const curve = new THREE.CatmullRomCurve3(pts);
          const tubeGeo = new THREE.TubeGeometry(curve, WARP_COUNT * 2, THREAD_RADIUS * 0.8, 8, false);
          
          let weftMat = MAT.weft;
          if(brokenSegment) weftMat = new THREE.MeshStandardMaterial({color:0xff1744, roughness:0.5});
          
          const weft = new THREE.Mesh(tubeGeo, weftMat);'''

new_code = '''const rowHeight = 0.08;
          const weftGeo = new THREE.PlaneGeometry(WARP_COUNT * SPACING + 0.4, rowHeight);
          weftGeo.rotateX(-Math.PI/2);
          
          const vStart = (totalWefts * rowHeight) % 10.0 / 10.0;
          const vEnd = ((totalWefts + 1) * rowHeight) % 10.0 / 10.0;
          const uvs = weftGeo.attributes.uv.array;
          uvs[1] = vEnd; uvs[3] = vEnd; uvs[5] = vStart; uvs[7] = vStart;
          weftGeo.attributes.uv.needsUpdate = true;
          
          const weft = new THREE.Mesh(weftGeo, sharedPrintedMaterial);
          weft.position.z = 0.01; // slight offset to prevent z-fighting if threads overlap
          
          const curve = new THREE.CatmullRomCurve3(pts);
          const tubeGeo = new THREE.TubeGeometry(curve, WARP_COUNT * 2, THREAD_RADIUS * 0.3, 4, false);
          let threadMat = new THREE.MeshBasicMaterial({color: 0x000000, transparent:true, opacity:0.1});
          if(brokenSegment) threadMat = new THREE.MeshStandardMaterial({color:0xff1744, roughness:0.5});
          const threadMesh = new THREE.Mesh(tubeGeo, threadMat);
          weft.add(threadMesh);'''

html = html.replace(tube_code, new_code)

with open(r'c:\Users\sushm\OneDrive\Desktop\llm_engineering-main\Handloom-Twin\Fiware\frntend\wev2.html', 'w', encoding='utf-8') as f:
    f.write(html)
