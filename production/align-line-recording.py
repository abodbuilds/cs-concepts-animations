"""Derive acoustic word timings while preserving the user's exact line timeline."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

import mlx.core as mx
from mlx_whisper.audio import N_FRAMES, load_audio, log_mel_spectrogram, pad_or_trim
from mlx_whisper.load_models import load_model
from mlx_whisper.timing import find_alignment, merge_punctuations
from mlx_whisper.tokenizer import get_tokenizer

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', required=True)
parser.add_argument('--model', required=True)
args = parser.parse_args()
root = Path(args.source_dir)
lines = json.loads((root / 'lines.json').read_text())
manifest = json.loads((root / 'graphics.json').read_text())
model = load_model(args.model, dtype=mx.float16)
tokenizer = get_tokenizer(model.is_multilingual, num_languages=model.num_languages, language='ar', task='transcribe')

def clean(text):
    text = re.sub(r'[\u064b-\u065f\u0670\u0640]', '', text)
    text = re.sub(r'ال(?=[A-Za-z])', 'الـ ', text)
    return re.sub(r'([…؟!،.:])(?=\S)', r'\1 ', text)

def canonical(text):
    return re.sub(r'[^\w]', '', re.sub(r'[\u064b-\u065f\u0670\u0640]', '', text)).lower()

scenes, flat_words = [], []
for line, origin in zip(lines, manifest['lines']):
    number = line['index']
    assert line['start'] == origin['start'] and line['end'] == origin['end']
    assert line['sourceFile'] == origin['clipFile']
    assert canonical(re.sub(r'\[[^\]]+\]', '', origin['text'])) == canonical(line['text'])
    # The three very fast takes are analyzed at half rate only. Acoustic times
    # are mapped back by the same exact factor; the production audio is untouched.
    rate = 0.5 if number in (6, 8, 9) else 1.0
    clip_path = root / (f'analysis-only-{number:03}-half-rate.wav' if rate == 0.5 else line['sourceFile'])
    audio = load_audio(str(clip_path))
    mel = log_mel_spectrogram(audio, n_mels=model.dims.n_mels)
    frames = mel.shape[0]
    mel = pad_or_trim(mel, N_FRAMES, axis=-2).astype(mx.float16)
    display = clean(line['text'])
    aligned = find_alignment(model, tokenizer, tokenizer.encode(' ' + display), mel, frames)
    merge_punctuations(aligned, '\"\'“¿([{-', '\"\'.。,，!！?؟:：”)]}、…،؛')
    detect = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(root / line['sourceFile']), '-af', 'silencedetect=noise=-35dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    pauses = [{'start': float(a), 'end': float(b)} for a, b in re.findall(r'silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)', detect.stderr)]
    duration = line['end'] - line['start']
    words = []
    for word in aligned:
        if not word.word.strip():
            continue
        start, end = float(word.start) * rate, float(word.end) * rate
        for gap in pauses:
            if gap['start'] - .02 <= start < gap['end'] and end > gap['end']:
                start = gap['end']
            if start < gap['start'] < end <= gap['end'] + .02:
                end = gap['start']
        start = max(0, min(duration, start))
        end = max(start, min(duration, end))
        item = {'text': word.word.strip(), 'start': line['start'] + start, 'end': line['start'] + end, 'relativeStart': start, 'relativeEnd': end, 'probability': float(word.probability)}
        words.append(item)
        flat_words.append({'line': number, 'lineID': origin['lineID'], 'takeID': origin['takeID'], 'clipFile': origin['clipFile'], **item})
    assert canonical(' '.join(word['text'] for word in words)) == canonical(line['text'])
    scenes.append({'index': number, 'start': line['start'], 'end': line['end'], 'text': line['text'], 'originalScriptText': origin['text'], 'displayText': display, 'clipFile': origin['clipFile'], 'lineID': origin['lineID'], 'takeID': origin['takeID'], 'analysisPlaybackRate': rate, 'words': words})
    print(json.dumps({'line': number, 'duration': duration, 'words': len(words), 'analysisRate': rate, 'zeroLengthWords': [word['text'] for word in words if word['end'] - word['start'] < .005]}, ensure_ascii=False), flush=True)

result = {'method': 'Local acoustic cross-attention alignment of the supplied text against each original take; exact manifest line boundaries retained. Fast takes 6, 8 and 9 analyzed at half rate and word times mapped back to original time.', 'scriptSha256': hashlib.sha256((root / 'lines.json').read_bytes()).hexdigest(), 'audioSha256': hashlib.sha256((root / 'audio.wav').read_bytes()).hexdigest(), 'graphicsSha256': hashlib.sha256((root / 'graphics.json').read_bytes()).hexdigest(), 'sourceCueEnd': manifest['duration'], 'sceneCuts': [line['start'] for line in lines] + [lines[-1]['end']], 'scenes': scenes}
(root / 'script-alignment.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
(root / 'words.json').write_text(json.dumps({'timeUnit': 'seconds', 'timingSource': result['method'], 'audioSha256': result['audioSha256'], 'words': flat_words}, ensure_ascii=False, indent=2) + '\n')
