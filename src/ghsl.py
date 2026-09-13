import numpy as np, tifffile, json, gc
TIF='data/GHS_POP_E2025_GLOBE_R2023A_4326_3ss_V1_0_R10_C29.tif'
tf=tifffile.TiffFile(TIF); pg=tf.pages[0]
print('ukuran',pg.shape,pg.dtype)
tags={t.name:t.value for t in pg.tags.values()}
ms=tags.get('ModelTiepointTag'); px=tags.get('ModelPixelScaleTag')
print('tiepoint',ms,'pixelscale',px)
P=pg.asarray().astype(np.float32)
tf.close(); gc.collect()
print('total populasi tile: %.1f juta'%(np.nansum(P)/1e6))
lon0=ms[3]; lat0=ms[4]; sx=px[0]; sy=px[1]
H,W=P.shape
print('cakupan lon %.3f..%.3f lat %.3f..%.3f'%(lon0, lon0+W*sx, lat0-H*sy, lat0))
np.save('data/POP.npy',P)
json.dump({'lon0':float(lon0),'lat0':float(lat0),'sx':float(sx),'sy':float(sy),
           'H':int(H),'W':int(W)}, open('data/pop_meta.json','w'))

# cek silang: populasi dalam kotak DKI Jakarta (approx 106.68-107.00, -6.37..-6.08)
def box(a,b,c,d):
    c0=int((a-lon0)/sx); c1=int((b-lon0)/sx)
    r0=int((lat0-d)/sy); r1=int((lat0-c)/sy)
    return float(np.nansum(P[r0:r1,c0:c1]))
print('kotak DKI Jakarta  : %.2f juta (acuan Dukcapil 11.01 juta)'%(box(106.68,107.01,-6.38,-6.07)/1e6))
print('kotak Jabodetabek  : %.2f juta (acuan ~32 juta)'%(box(106.35,107.20,-6.80,-5.95)/1e6))
print('kotak Bandung Raya : %.2f juta'%(box(107.45,107.80,-7.05,-6.80)/1e6))
