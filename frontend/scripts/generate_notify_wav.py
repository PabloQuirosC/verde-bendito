import wave
import math
import struct
import os

os.makedirs('frontend/public/sounds', exist_ok=True)

framerate = 44100
duration = 0.25  # segundos
freq = 1000.0
amplitude = 16000
nframes = int(framerate * duration)

frames = bytearray()
for i in range(nframes):
    sample = int(amplitude * math.sin(2 * math.pi * freq * (i / framerate)))
    frames += struct.pack('<h', sample)

with wave.open('frontend/public/sounds/notify.mp3', 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(framerate)
    wf.writeframes(frames)

print('WAV generado como frontend/public/sounds/notify.mp3')
