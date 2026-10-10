#!/usr/bin/env python3
"""Check publication candidates without printing credential values or changing files."""
import argparse
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--revision', help='Check a committed public tree, e.g. main')
args = parser.parse_args()
if args.revision:
    files = subprocess.check_output(['git', 'ls-tree', '-rz', '--name-only', args.revision]).decode().split('\0')
    read = lambda name: subprocess.check_output(['git', 'show', f'{args.revision}:{name}'])
else:
    files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z']).decode().split('\0')
    read = lambda name: Path(name).read_bytes()
files = sorted(set(name for name in files if name))
patterns = {
    'private-key': rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'github-token': rb'gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}',
    'npm-token': rb'npm_[A-Za-z0-9]{30,}',
    'aws-key': rb'AKIA[A-Z0-9]{16}',
    'credential-url': rb'https?://[^\s/:]+:[^\s/@]+@',
    'private-home-path': rb'/(?:home|Users)/[A-Za-z0-9_-]+',
    'literal-credential': rb'(?i)(?:password|access_token|auth_token|client_secret|api_key)\s*[:=]\s*[\x22\x27][^\x22\x27\s]{8,}[\x22\x27]',
}
excluded = ('.local-tools/', '.aws/', '.codex/', '.agents/', 'node_modules/', 'artifacts/', 'test-results/', 'apps/web/dist/', 'android/app/build/', 'android/app/build-mobile/', 'android/app/build-alpha/')
findings = []
total = 0
for name in files:
    data = read(name)
    total += len(data)
    if name.startswith(excluded) or name == 'android/local.properties' or name.endswith(('.apk', '.aab', '.jks', '.keystore', '.pem', '.p12')) or name.startswith('.env'):
        findings.append({'file': name, 'category': 'excluded-local-data'})
    if len(data) > 2_000_000:
        findings.append({'file': name, 'category': 'large-file-needs-review'})
    for category, pattern in patterns.items():
        if re.search(pattern, data):
            findings.append({'file': name, 'category': category})
print(json.dumps({'files': len(files), 'bytes': total, 'findings': findings}, indent=2))
raise SystemExit(1 if findings else 0)
