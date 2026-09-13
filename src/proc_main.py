import numpy as np, json, base64, sys

def read_hdr(fh):
    h={}
    for _ in range(6):
        k,v=fh.readline().split()
        h[k.lower()]=float(v)
    h['ncols']=int(h['ncols']); h['nrows']=int(h['nrows'])
    return h

# ---------- GRID UTAMA (fisika tsunami) ----------
fh=open('data/gmrt_full.asc')
H=read_hdr(fh)
nc,nr,cs=H['ncols'],H['nrows'],H['cellsize']
lon0=H['xllcorner']; lat0=H['yllcorner']
rows=[]
for line in fh:
    if not line.strip(): continue
    rows.append(np.fromstring(line, sep=' ', dtype=np.float64))
fh.close()
E=np.array(rows, dtype=np.float32)   # baris 0 = paling utara
print('grid utama', E.shape, 'cellsize', cs, 'deg =', round(cs*111.32,2),'km')
print('elev min/max', float(E.min()), float(E.max()))
assert E.shape==(nr,nc)

lats = lat0 + cs*(np.arange(nr-1,-1,-1)+0.5)   # untuk baris 0..nr-1 (utara->selatan)
lons = lon0 + cs*(np.arange(nc)+0.5)
print('lon', lons[0], '->', lons[-1], '| lat', lats[0],'->',lats[-1])

# fraksi laut / darat
sea = E<0
print('fraksi laut %.1f%%'%(100*sea.mean()))
print('kedalaman maks %.0f m'%(-E.min()))

# ---------- EKSTRAK PALUNG SUNDA dari data ----------
# palung = titik terdalam per kolom bujur, dicari di sisi samudra (barat daya busur)
trench=[]
for j in range(nc):
    col=E[:,j]
    i=int(np.argmin(col))
    d=float(col[i])
    if d<-4000:
        trench.append((float(lons[j]), float(lats[i]), d))
print('titik palung terdeteksi:', len(trench))
for t in trench[::60]:
    print('  lon %.2f lat %.2f depth %.0f'%t)

np.save('data/E_main.npy', E)
json.dump({'nc':nc,'nr':nr,'cs':cs,'lon0':float(lon0),'lat0':float(lat0),
           'lonW':float(lons[0]-cs/2),'lonE':float(lons[-1]+cs/2),
           'latN':float(lats[0]+cs/2),'latS':float(lats[-1]-cs/2),
           'trench':trench}, open('data/main_meta.json','w'))
print('OK -> data/E_main.npy')
