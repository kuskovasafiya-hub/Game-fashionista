"""Run every job in art-src/v2/jobs-*.tsv whose output is missing, N at a time.
  art-src/.venv/bin/python art-src/v2/run_jobs.py [N=8] [name ...]
With names, (re)runs only those jobs, deleting their old outputs first."""
import pathlib
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

V2 = pathlib.Path(__file__).resolve().parent
RAW = V2 / 'raw'
GEN = {'pairs': 'gen_pair.sh', 'layers': 'gen_layer.sh', 'makeup': 'gen_makeup.sh'}


def outputs(kind, name):
    return [RAW / f'{name}-{k}.png' for k in ('ref', 'back', 'front')] if kind == 'pairs' else [RAW / f'{name}.png']


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    only = set(sys.argv[2:])
    jobs = []
    for kind in GEN:
        for line in (V2 / f'jobs-{kind}.tsv').read_text().splitlines():
            if not line.strip():
                continue
            name, what = line.split('\t', 1)
            if only and name not in only:
                continue
            if only:
                for p in outputs(kind, name):
                    p.unlink(missing_ok=True)
            if all(p.exists() for p in outputs(kind, name)):
                continue
            jobs.append((kind, name, what))

    def run(job):
        kind, name, what = job
        r = subprocess.run([str(V2 / GEN[kind]), name, what], capture_output=True, text=True)
        print(r.stdout.strip() or f'FAILED {name}', flush=True)

    with ThreadPoolExecutor(n) as ex:
        list(ex.map(run, jobs))


if __name__ == '__main__':
    main()
