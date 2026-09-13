import numpy as np, json
E=np.load('data/E_main.npy')           # (512,684) baris0=utara
Z=np.load('data/Z_zoom.npy')           # (568,705)
M=json.load(open('data/main_meta.json'))
ZM=json.load(open('data/zoom_meta.json'))

# balik supaya baris 0 = paling SELATAN (lintang naik seiring j) -> memudahkan metrik bola
E=np.flipud(E).copy()
Z=np.flipud(Z).copy()
Ei=np.clip(np.round(E),-32000,32000).astype('<i2')
Zi=np.clip(np.round(Z),-32000,32000).astype('<i2')
Ei.tofile('data/main.i16'); Zi.tofile('data/zoom.i16')
print('main.i16', Ei.shape, Ei.nbytes//1024,'KB')
print('zoom.i16', Zi.shape, Zi.nbytes//1024,'KB')

meta=dict(
  main=dict(nx=int(E.shape[1]), ny=int(E.shape[0]), cs=M['cs'],
            lonW=M['lonW'], latS=M['latS'], lonE=M['lonE'], latN=M['latN']),
  zoom=dict(nx=int(Z.shape[1]), ny=int(Z.shape[0]), cs=ZM['cs'],
            lonW=ZM['lonW'], latS=ZM['latS'], lonE=ZM['lonE'], latN=ZM['latN']),
)
# bersihkan palung: buang lompatan tak wajar, urut menurut bujur, haluskan
tr=sorted([t for t in M['trench'] if 100.6<t[0]<111.6], key=lambda t:t[0])
lat=np.array([t[1] for t in tr]); lon=np.array([t[0] for t in tr])
med=np.copy(lat)
for i in range(len(lat)):
    a=max(0,i-6); b=min(len(lat),i+7); med[i]=np.median(lat[a:b])
keep=np.abs(lat-med)<0.35
lon,lat=lon[keep],lat[keep]
k=np.ones(9)/9.0
lat=np.convolve(np.pad(lat,(4,4),mode='edge'),k,mode='valid')
meta['trench']=[[round(float(a),4),round(float(b),4)] for a,b in zip(lon,lat)]
# panjang busur palung
R=6371.0
d=0.0; seg=[0.0]
for i in range(1,len(lon)):
    dx=(lon[i]-lon[i-1])*np.cos(np.radians(0.5*(lat[i]+lat[i-1])))*111.32
    dy=(lat[i]-lat[i-1])*110.57
    d+=np.hypot(dx,dy); seg.append(d)
meta['trenchLenKm']=round(d,1)
meta['trenchS']=[round(float(s),2) for s in seg]
print('panjang palung dalam domain: %.0f km, titik: %d'%(d,len(lon)))
print('palung ujung BL lon %.2f lat %.2f -> ujung TG lon %.2f lat %.2f'%(lon[0],lat[0],lon[-1],lat[-1]))

# katalog gempa nyata USGS
g=json.load(open('data/usgs_hist.geojson'))
ev=[]
for f in g['features']:
    p=f['properties']; c=f['geometry']['coordinates']
    if p['mag'] is None: continue
    ev.append([round(c[0],3), round(c[1],3), round(c[2] or 10,1), round(p['mag'],1), int(p['time']//1000)])
meta['quakes']=ev
print('gempa nyata dimuat:',len(ev))
json.dump(meta, open('data/meta.json','w'))
print('OK')
