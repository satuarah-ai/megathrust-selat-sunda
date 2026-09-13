import numpy as np, json
fh=open('data/gmrt_zoom.asc')
H={}
for _ in range(6):
    k,v=fh.readline().split(); H[k.lower()]=float(v)
nc=int(H['ncols']); nr=int(H['nrows']); cs=H['cellsize']
lon0=H['xllcorner']; lat0=H['yllcorner']
print('zoom',nr,'x',nc,'cs=%.6f deg = %.0f m'%(cs, cs*111320))
latN = lat0 + nr*cs
def r2lat(r): return latN - (r+0.5)*cs
def c2lon(c): return lon0 + (c+0.5)*cs

# jendela resolusi penuh: pesisir Teluk Jakarta (Jabodetabek)
JA = dict(lonW=106.30, lonE=107.30, latN=-5.85, latS=-6.45)
c0=int((JA['lonW']-lon0)/cs); c1=int((JA['lonE']-lon0)/cs)
r0=int((latN-JA['latN'])/cs); r1=int((latN-JA['latS'])/cs)
print('jendela Jakarta rows',r0,r1,'cols',c0,c1,'=',(r1-r0),'x',(c1-c0))
JAW=np.full((r1-r0, c1-c0), np.nan, dtype=np.float32)

# jendela pesisir Banten barat (Merak-Anyer-Carita-Labuan)
BT = dict(lonW=105.45, lonE=106.20, latN=-5.80, latS=-6.90)
bc0=int((BT['lonW']-lon0)/cs); bc1=int((BT['lonE']-lon0)/cs)
br0=int((latN-BT['latN'])/cs); br1=int((latN-BT['latS'])/cs)
BTW=np.full((br1-br0, bc1-bc0), np.nan, dtype=np.float32)

F=8  # faktor downsample -> ~4.4 km? no: cs*8 = 0.0044 deg = 489 m
onr=nr//F; onc=nc//F
acc=np.zeros((onr,onc),dtype=np.float64); cnt=np.zeros((onr,onc),dtype=np.int32)

for r in range(nr):
    line=fh.readline()
    if not line: break
    row=np.fromstring(line, sep=' ', dtype=np.float64)
    if row.size!=nc: continue
    if r0<=r<r1: JAW[r-r0]=row[c0:c1]
    if br0<=r<br1: BTW[r-br0]=row[bc0:bc1]
    orr=r//F
    if orr<onr:
        t=row[:onc*F].reshape(onc,F).mean(axis=1)
        acc[orr]+=t; cnt[orr]+=1
    if r%800==0: print(' baris',r,'/',nr,flush=True)
fh.close()
Z=(acc/np.maximum(cnt,1)).astype(np.float32)
print('zoom downsample',Z.shape,'cs=%.5f deg = %.0f m'%(cs*F, cs*F*111320))
print('Z min/max %.0f %.0f'%(Z.min(),Z.max()))
np.save('data/Z_zoom.npy',Z); np.save('data/JAW.npy',JAW); np.save('data/BTW.npy',BTW)
json.dump({'nc':onc,'nr':onr,'cs':cs*F,'lonW':lon0,'latN':latN,
           'lonE':lon0+onc*cs*F,'latS':latN-onr*cs*F,
           'JA':dict(JA, r0=r0,r1=r1,c0=c0,c1=c1,cs=cs),
           'BT':dict(BT, r0=br0,r1=br1,c0=bc0,c1=bc1,cs=cs)}, open('data/zoom_meta.json','w'))
print('JAW',JAW.shape,'nan?',np.isnan(JAW).sum(),'| BTW',BTW.shape,'nan?',np.isnan(BTW).sum())
print('OK')
