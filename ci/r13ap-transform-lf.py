from pathlib import Path
import runpy, sys

if len(sys.argv) != 2:
    raise SystemExit('usage: r13ap-transform-lf.py <candidate-dir>')

original_write_text = Path.write_text

def write_text_lf(self, data, encoding=None, errors=None, newline=None):
    return original_write_text(self, data, encoding=encoding or 'utf-8', errors=errors, newline='\n')

Path.write_text = write_text_lf
transform = str(Path(__file__).with_name('r13ap-transform.py'))
target = sys.argv[1]
sys.argv = [transform, target]
runpy.run_path(transform, run_name='__main__')
