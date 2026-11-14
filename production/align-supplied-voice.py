"""Align the exact supplied script locally; recognition is used only for rough windows."""
import argparse
import hashlib
import json
import re
from pathlib import Path

import mlx.core as mx
from mlx_whisper.audio import N_FRAMES, SAMPLE_RATE, load_audio, log_mel_spectrogram, pad_or_trim
from mlx_whisper.load_models import load_model
from mlx_whisper.timing import find_alignment, merge_punctuations
from mlx_whisper.tokenizer import get_tokenizer

parser = argparse.ArgumentParser()
parser.add_argument("--source-dir", required=True)
parser.add_argument("--model", required=True)
args = parser.parse_args()
root = Path(args.source_dir)
source = json.loads((root / "script.json").read_text())[0]
paragraphs = [line.strip() for line in source["text"].splitlines() if line.strip()]
rough = json.loads((root / "rough-scene-cuts.json").read_text())["cuts"]
pauses = json.loads((root / "pauses.json").read_text())
merged = []
for pause in pauses:
    if merged and pause["start"] - merged[-1]["end"] < 0.08:
        merged[-1]["end"] = pause["end"]
    else:
        merged.append(dict(pause))
assert len(paragraphs) == len(rough) - 1

def clean(text):
    text = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", text)
    text = re.sub(r"ال(?=[A-Za-z])", "الـ ", text)
    return re.sub(r"([…؟!،.:])(?=\S)", r"\1 ", text)

def canonical(text):
    return re.sub(r"[^\w]", "", re.sub(r"[\u064b-\u065f\u0670\u0640]", "", text)).lower()

# Place visual cuts inside the observed sentence pauses, without editing audio.
cuts = [0.0]
for point in rough[1:-1]:
    choices = [p for p in merged if p["end"] - p["start"] >= 0.25 and abs((p["start"] + p["end"]) / 2 - point) < 1]
    if not choices:
        raise ValueError(f"No measured scene pause near {point}; inspect the recording.")
    pause = min(choices, key=lambda p: abs((p["start"] + p["end"]) / 2 - point))
    cuts.append(round((pause["start"] + pause["end"]) / 2 * 30) / 30)
cuts.append(rough[-1])
assert all(a < b for a, b in zip(cuts, cuts[1:]))

model = load_model(args.model, dtype=mx.float16)
tokenizer = get_tokenizer(model.is_multilingual, num_languages=model.num_languages, language="ar", task="transcribe")
audio = load_audio(str(root / "voiceover.mp3"))
scenes = []
for i, script in enumerate(paragraphs):
    start, end = cuts[i], cuts[i + 1]
    clip = audio[round(start * SAMPLE_RATE):round(end * SAMPLE_RATE)]
    mel = log_mel_spectrogram(clip, n_mels=model.dims.n_mels)
    num_frames = mel.shape[0]
    mel = pad_or_trim(mel, N_FRAMES, axis=-2).astype(mx.float16)
    display = clean(script)
    alignment = find_alignment(model, tokenizer, tokenizer.encode(" " + display), mel, num_frames)
    merge_punctuations(alignment, "\"'“¿([{-", "\"'.。,，!！?؟:：”)]}、…،؛")
    words = []
    for word in alignment:
        if not word.word.strip():
            continue
        a, b = start + float(word.start), start + float(word.end)
        # Keep pauses out of word onsets and endings when the acoustic boundary
        # lies within a measured low-energy interval.
        for gap in merged:
            if gap["start"] - 0.025 <= a < gap["end"] and b > gap["end"]:
                a = gap["end"]
            if a < gap["start"] < b <= gap["end"] + 0.025:
                b = gap["start"]
        words.append({"text": word.word.strip(), "start": round(a, 6), "end": round(max(a, b), 6), "probability": float(word.probability)})
    assert canonical(" ".join(w["text"] for w in words)) == canonical(script), f"Source words lost in paragraph {i + 1}"
    scenes.append({"index": i + 1, "start": start, "end": end, "text": script, "displayText": display, "words": words})
    print(json.dumps({"scene": i + 1, "start": start, "end": end, "words": len(words)}, ensure_ascii=False), flush=True)

result = {"method": "Local Whisper cross-attention forced alignment of the supplied text; scene cuts and word onsets refined using measured pauses.", "scriptSha256": hashlib.sha256((root / "script.json").read_bytes()).hexdigest(), "audioSha256": hashlib.sha256((root / "voiceover.mp3").read_bytes()).hexdigest(), "sourceCueEnd": source["end"], "decodedAudioDuration": len(audio) / SAMPLE_RATE, "sceneCuts": cuts, "scenes": scenes}
(root / "script-alignment.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
