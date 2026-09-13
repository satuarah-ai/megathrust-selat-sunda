import numpy as np, json, sys
from matplotlib.path import Path
meta=json.load(open('data/meta.json')); g=meta['main']
nx,ny,cs,lonW,latS=g['nx'],g['ny'],g['cs'],g['lonW'],g['latS']
POP=np.load('data/POP.npy'); pm=json.load(open('data/pop_meta.json'))
plon0,plat0,psx,psy,PH,PW=pm['lon0'],pm['lat0'],pm['sx'],pm['sy'],pm['H'],pm['W']

# --- 1. agregasi populasi GHSL (100 m) ke grid utama (1,96 km) ---
POPg=np.zeros((ny,nx),dtype=np.float64)
# untuk tiap piksel GHSL cari sel grid utama
rows=np.arange(PH); cols=np.arange(PW)
plat=plat0-(rows+0.5)*psy; plon=plon0+(cols+0.5)*psx
jj=np.floor((plat-latS)/cs).astype(np.int32)
ii=np.floor((plon-lonW)/cs).astype(np.int32)
okj=(jj>=0)&(jj<ny); oki=(ii>=0)&(ii<nx)
print('memetakan',PH,'baris populasi ...')
for r in range(PH):
    if not okj[r]: continue
    row=POP[r]
    m=oki & np.isfinite(row) & (row>0)
    if not m.any(): continue
    np.add.at(POPg[jj[r]], ii[m], row[m])
print('total populasi di grid utama: %.1f juta'%(POPg.sum()/1e6))
np.save('data/POPg.npy',POPg.astype(np.float32))

# --- 2. petakan tiap sel grid ke kabupaten/kota GADM ---
gd=json.load(open('data/gadm41_IDN_2.json'))
PROV={'JakartaRaya','JawaBarat','Banten','Lampung','JawaTengah','SumateraSelatan','Bengkulu','YogyakartaRaya'}
def norm(s): return s.replace(' ','').replace('.','')
feats=[f for f in gd['features'] if norm(f['properties'].get('NAME_1','')) in PROV]
print('poligon kabupaten/kota terpilih:',len(feats))
LON,LAT=np.meshgrid(lonW+(np.arange(nx)+0.5)*cs, latS+(np.arange(ny)+0.5)*cs)
pts=np.column_stack([LON.ravel(),LAT.ravel()])
owner=np.full(nx*ny,-1,dtype=np.int32)
names=[]
for idx,f in enumerate(feats):
    p=f['properties']; names.append((p.get('NAME_1'),p.get('NAME_2'),p.get('TYPE_2','')))
    geom=f['geometry']; polys= geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]
    for poly in polys:
        ring=np.array(poly[0])
        lo,la=ring[:,0],ring[:,1]
        if lo.min()>lonW+nx*cs or lo.max()<lonW or la.min()>latS+ny*cs or la.max()<latS: continue
        sel=(pts[:,0]>=lo.min())&(pts[:,0]<=lo.max())&(pts[:,1]>=la.min())&(pts[:,1]<=la.max())
        if not sel.any(): continue
        inside=Path(ring).contains_points(pts[sel])
        w=np.where(sel)[0][inside]
        owner[w]=idx
    if idx%40==0: print('  ',idx,'/',len(feats),flush=True)
np.save('data/owner.npy',owner)
json.dump(names,open('data/kabnames.json','w'))
cnt=(owner>=0).sum(); print('sel darat terpetakan:',cnt)
pg=POPg.ravel()
print('populasi dalam poligon: %.1f juta (dari %.1f juta total grid)'%(pg[owner>=0].sum()/1e6,pg.sum()/1e6))
