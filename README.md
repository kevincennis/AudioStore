# AudioStore

Launch the demo with `npm start` and visit `http://localhost:8000`.


### DB

Generic `IndexedDB` wrapper. Doesn't care about audio, just gets/sets data.

### AudioStore

Audio-aware storage interface. Takes `AudioBuffer` instances, breaks them
into chunks, and saves them to with `db.js`.

Allows consumers to read `AudioBuffers` of arbitrary length and position
by reading multiple chunks out of `db.js` and stitching them together.

Essentially, consumers of `AudioStore` don't need to care about *how* things
are stored. They simply ask for an `AudioBuffer` of a given length and offset,
and `AudioStore` will make one on the fly.

### Streamer

Responsible for loading an audio asset via AJAX, saving it to an `AudioStore`,
and then streaming audio back out of the `AudioStore`.

When the in-memory buffer starts to get low, it requests a new `AudioBuffer`
from the `AudioStore` and schedules playback with sample-level accuracy.

The idea is that this only holds about ~10s of audio in memory at
any given time.

### StreamCoordinator

Responsible for managing and synchronizing multiple `Streamer` instances.

Provides a nearly identical API to `Streamer` so that it can be used with
a `Player` instance.

Note: this is not fully fleshed out, and was mostly built as a demonstration
for someone I'm helping out with a related project.

### Player

The UI for a `Streamer` or `StreamCoordinator`. Pretty standard stuff.
