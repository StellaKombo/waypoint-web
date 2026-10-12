"""Build only distributed Waypoint client assets from a public release repository."""
from pathlib import Path
from urllib.parse import urlsplit
import io, json, os, re, shutil, tempfile, zipfile

ASSETS=('index.html','styles.css','app.js','core.js','cloud.js','recreate.js',
        'privacy.html','privacy.css','fixture.html','fixture.js','fixture.css',
        'runner-readme.txt','agent-readme.txt','native-readme.txt','rea-readme.txt',
        'reliability-requirements.txt','release-checklist.txt',
        'waypoint-runner.zip','waypoint-agent-kit.zip')
RUNNER=('PROTOCOL.md','README.md','audit.js','design-snapshot.js','engine.js',
        'manifest.json','popup.css','popup.html','popup.js','protocol-utils.js',
        'service-worker.js','fixture/fixture.html','fixture/fixture.js','fixture/fixture.css')
AGENT=('NATIVE.md','REA-LICENSE.txt','REA.md','README.md','generate-mcp-config.mjs',
       'instructions.mjs','native-adapter.mjs','rea-adapter.mjs','server.mjs')

def origin(value):
    parsed=urlsplit(value)
    host=parsed.hostname or ''
    if (parsed.scheme!='https' or not re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?',host)
        or parsed.username or parsed.password or parsed.port or parsed.path or parsed.query
        or parsed.fragment or value!='https://'+host):
        raise ValueError('Supply one exact HTTPS dashboard origin without credentials, path, query or port.')
    return value

def client_archive(data,prefix,names):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos=archive.infolist()
        expected={prefix+'/'+name for name in names}
        if len(infos)!=len(expected) or {item.filename for item in infos}!=expected:
            raise ValueError('The companion archive contains unexpected or duplicate files.')
        if sum(item.file_size for item in infos)>2*1024*1024 or any(item.flag_bits&1 or item.file_size>512*1024 for item in infos):
            raise ValueError('The companion archive is too large or encrypted.')
        return {item.filename:archive.read(item).decode('utf-8') for item in infos}

def build(root,value):
    target=origin(value);assets=root/'assets'
    if not assets.is_dir() or assets.is_symlink():raise ValueError('The client assets must be a regular directory.')
    data={}
    for name in ASSETS:
        file=assets/name
        if not file.is_file() or file.is_symlink():raise ValueError('Missing regular client asset: '+name)
        if file.stat().st_size>4*1024*1024:raise ValueError('Client asset is too large: '+name)
        data[name]=file.read_bytes()
    runner=client_archive(data['waypoint-runner.zip'],'waypoint-runner',RUNNER)
    client_archive(data['waypoint-agent-kit.zip'],'waypoint-agent-kit',AGENT)
    match=re.search(r"const DASHBOARD_ORIGIN = '([^']+)';",runner['waypoint-runner/protocol-utils.js'])
    if not match:raise ValueError('The Chrome companion has no configured origin.')
    before=origin(match.group(1));runner={name:contents.replace(before,target) for name,contents in runner.items()}
    manifest=json.loads(runner['waypoint-runner/manifest.json'])
    manifest['externally_connectable']={'matches':[target+'/*']}
    runner['waypoint-runner/manifest.json']=json.dumps(manifest,indent=2)+'\n'
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for name,contents in sorted(runner.items()):archive.writestr(name,contents)
    data['waypoint-runner.zip']=buffer.getvalue()
    for name in ASSETS:
        if not name.endswith('.zip'):data[name]=data[name].decode('utf-8').replace(before,target).encode('utf-8')
    with tempfile.TemporaryDirectory(prefix='.waypoint-site-',dir=root) as staging:
        output=Path(staging)/'site';output.mkdir()
        for name,contents in data.items():(output/name).write_bytes(contents)
        destination=root/'site'
        if destination.is_symlink():raise ValueError('Refusing a symlinked output directory.')
        if destination.exists():shutil.rmtree(destination)
        shutil.move(str(output),str(destination))
    print('Built 19 client assets for '+target+'; backend, tests and full source archive excluded.')

if __name__=='__main__':
    build(Path(__file__).resolve().parent,os.environ.get('WAYPOINT_DASHBOARD_ORIGIN') or os.environ.get('RENDER_EXTERNAL_URL',''))
