# SPDX-License-Identifier: GPL-3.0-only
"""Deterministic allowlisted source packaging; never walks the development tree."""
from pathlib import Path
import json,hashlib,tarfile,gzip,io
root=Path(__file__).resolve().parent.parent
previous=json.loads((root/'SOURCE_FILES.json').read_text())
paths=sorted(set(x['path'] for x in previous['files'])|{'scripts/package-source.py','tests/browser/source-link.spec.ts','playwright.source-link.config.ts'})
for name in paths:
 p=Path(name)
 assert not p.is_absolute() and '..' not in p.parts and (root/p).is_file() and not (root/p).is_symlink()
rows=[{'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in paths]
m={'profile':'RELEASE-03.1 model-free offline preview','files':rows,'selfHashConvention':'Manifest excludes itself, manifest checksum and generated source archive/checksum','node':'22.16.0','npm':'10.9.2','excluded':previous['excluded']}
(root/'SOURCE_FILES.json').write_text(json.dumps(m,indent=2)+'\n')
(root/'SOURCE_FILES.sha256').write_text(hashlib.sha256((root/'SOURCE_FILES.json').read_bytes()).hexdigest()+'  SOURCE_FILES.json\n')
a=root/'apps/web/public/shashbesh-source.tar.gz'
with a.open('wb') as raw:
 with gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as gz:
  with tarfile.open(fileobj=gz,mode='w') as t:
   for name in paths+['SOURCE_FILES.json','SOURCE_FILES.sha256']:
    data=(root/name).read_bytes();entry=tarfile.TarInfo('ShashBesh-source/'+name);entry.size=len(data);entry.mode=0o644;t.addfile(entry,io.BytesIO(data))
(root/'apps/web/public/shashbesh-source.tar.gz.sha256').write_text(hashlib.sha256(a.read_bytes()).hexdigest()+'  shashbesh-source.tar.gz\n')
print('SOURCE_SHA256='+hashlib.sha256(a.read_bytes()).hexdigest())
