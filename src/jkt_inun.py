import numpy as np, json
from collections import deque
J=np.load('data/JAW.npy')            # 61 m, lon 106.30-107.30, lat -5.85..-6.45
zm=json.load(open('data/zoom_meta.json')); JA=zm['JA']; cs=JA['cs']
H,W=J.shape
lonW=JA['lonW']; latN=JA['latN']
print('jendela Jakarta: %dx%d sel @ %.0f m  (lon %.2f-%.2f, lat %.2f..%.2f)'%(H,W,cs*111320,lonW,JA['lonE'],latN,JA['latS']))
POP=np.load('data/POP.npy'); pm=json.load(open('data/pop_meta.json'))
# populasi pada kisi 61 m (ambil terdekat dari GHSL 100 m, lalu bagi rata luas)
rr=((pm['lat0']-(latN-(np.arange(H)+0.5)*cs))/pm['sy']).astype(int)
cc=(((lonW+(np.arange(W)+0.5)*cs)-pm['lon0'])/pm['sx']).astype(int)
rr=np.clip(rr,0,pm['H']-1); cc=np.clip(cc,0,pm['W']-1)
PJ=POP[np.ix_(rr,cc)].astype(np.float32)
scale=(cs*111320)**2/((pm['sx']*111320)**2)      # luas sel 61m / luas sel 100m
PJ=PJ*scale
print('populasi jendela: %.2f juta'%(PJ.sum()/1e6))

SUBS=0.51   # amblesan koseismik Jakarta (m) dari model Okada
def flood(level, subsidence=SUBS):
    ground=J-subsidence                    # tanah turun -> efektif lebih rendah
    wet=ground<level
    # banjir hanya yang TERHUBUNG ke laut (bak mandi terhubung)
    seed=np.zeros((H,W),bool)
    seed[0,:]|=wet[0,:]                    # tepi utara = Laut Jawa
    seed[:,0]|=wet[:,0]; seed[:,-1]|=wet[:,-1]
    lab=np.zeros((H,W),np.uint8)
    q=deque(zip(*np.nonzero(seed)))
    for y,x in q: lab[y,x]=1
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx_=y+dy,x+dx
            if 0<=ny<H and 0<=nx_<W and lab[ny,nx_]==0 and wet[ny,nx_]:
                lab[ny,nx_]=1; q.append((ny,nx_))
    fl=(lab==1)&(J>=0)                     # hanya daratan yang tergenang
    depth=np.where(fl, level-(J-subsidence), 0)
    area=fl.sum()*(cs*111320)**2/1e6
    pop=PJ[fl].sum()
    return area,pop,depth,fl

print('\n--- KURVA GENANGAN JAKARTA (termasuk amblesan koseismik 0,51 m) ---')
print(' tinggi air | luas tergenang | penduduk di zona | kedalaman rata2')
out=[]
for lv in [0.0,0.5,1.0,1.5,2.0,2.5,3.0,4.0,5.0]:
    a,p,d,fl=flood(lv)
    md=d[fl].mean() if fl.any() else 0
    out.append([lv,round(a,1),int(p),round(float(md),2)])
    print('  %4.1f m    | %8.1f km2   | %s jiwa | %.2f m'%(lv,a,f'{int(p):,}'.replace(',','.'),md))
print('\n--- PEMBANDING: tanpa amblesan koseismik ---')
for lv in [1.0,2.0,2.5]:
    a,p,_,_=flood(lv,0.0)
    print('  %4.1f m    | %8.1f km2   | %s jiwa'%(lv,a,f'{int(p):,}'.replace(',','.')))
a,p,depth,fl=flood(2.5)
print('\nSKENARIO: tsunami 2,5 m di Teluk Jakarta -> %.0f km2 tergenang, %s jiwa'%(a,f'{int(p):,}'.replace(',','.')))
# raster genangan untuk artifact (turunkan ke ~245 m)
F=4
dh,dw=H//F,W//F
D=depth[:dh*F,:dw*F].reshape(dh,F,dw,F).max(axis=(1,3))
Q=np.clip(np.round(D*20),0,250).astype(np.uint8)
Q.tofile('data/jkt_flood.u8')
json.dump({'h':dh,'w':dw,'cs':cs*F,'lonW':lonW,'latN':latN,'scale':20,'curve':out,
           'subs':SUBS,'popWin':float(PJ.sum())},open('data/jkt_flood.json','w'))
print('raster genangan %dx%d @ %.0f m -> data/jkt_flood.u8'%(dh,dw,cs*F*111320))
