import { synth, renderAbc } from "abcjs";
import { Fretboard } from "@moonwave99/fretboard.js";
import { Paino } from "@moonwave99/paino";
import { midiToNoteName } from "@tonaljs/midi";
import "abcjs/abcjs-audio.css";
import "@moonwave99/paino/src/styles/paino.css";

window.addEventListener("DOMContentLoaded", init);

async function init() {
  document.querySelectorAll("[data-piano]").forEach(initPiano);
  document.querySelectorAll("[data-fretboard]").forEach(initFretboard);

  const controls = await Promise.all(
    [...document.querySelectorAll("[data-abc]")].map(initABC),
  );

  controls.forEach(({ cursorControl }) => {
    cursorControl?.onPlayback((index) => {
      controls.forEach((c) => {
        if (index === c.cursorControl?.index) {
          return;
        }
        c.synthControl?.pause();
        c.synthControl?.restart();
      });
    });
  });
}

function parsePianoData(data) {
  return data.split("\n").reduce(
    (memo, line) => {
      const match = line.match(/\w+:/);
      if (match) {
        const [key, notes] = line.split(":");
        return {
          ...memo,
          [key]: notes.trim().split(" "),
        };
      } else {
        return {
          ...memo,
          notes: line.trim().split(" "),
        };
      }
    },
    { notes: [] },
  );
}

const fretboardConfiguration = {
  dotSize: 25,
  fretCount: 16,
  fretsWidth: 1.2,
  font: "Futura",
  stringWidth: [2, 2, 2, 3, 4, 5],
  nutWidth: 10,
};

function getFretCount(chord, fretLeftPadding = 0) {
  let normalisedChord =
    chord.indexOf("-") > 1 ? chord.split("-") : chord.split("");
  const frets = normalisedChord
    .filter((x) => x !== "x")
    .map((x) => +x)
    .sort((a, b) => a - b);
  return frets[frets.length - 1] - frets[0] + +fretLeftPadding + 1;
}

function initFretboard(el) {
  const { chord, crop, showFretNumbers, fretLeftPadding, fretCount } =
    el.dataset;

  new Fretboard({
    ...fretboardConfiguration,
    el,
    width: 400,
    height: 300,
    bottomPadding: 0,
    scaleFrets: false,
    fretWidth: 2,
    fretCount: fretCount || getFretCount(chord, fretLeftPadding),
    dotSize: 40,
    dotStrokeWidth: 5,
    fretNumbersMargin: 30,
    showFretNumbers: !!showFretNumbers,
    fretLeftPadding: fretLeftPadding ? +fretLeftPadding : 0,
    crop,
    showFretNumbers: true,
  })
    .renderChord(chord)
    .style({ fill: "#ff9505" });
}

function initPiano(el) {
  const data = el.querySelector("code").textContent.trim();
  if (!data) {
    return;
  }

  const piano = document.createElement("div");
  const pianoWrapper = document.createElement("div");
  pianoWrapper.appendChild(piano);
  pianoWrapper.classList.add("pianoWrapper");
  el.appendChild(pianoWrapper);

  const pianoController = new Paino({
    el: piano,
    octaves: 5,
    startOctave: 2,
  });
  pianoController.render();
  pianoController.setNotes(parsePianoData(data));
}

async function initABC(el, index) {
  const data = el.querySelector("code").textContent.trim();
  if (!data) {
    return;
  }

  const staff = document.createElement("div");
  const audio = document.createElement("div");
  const pianoWrapper = document.createElement("div");
  const piano = document.createElement("div");

  el.appendChild(staff);
  el.appendChild(audio);
  el.appendChild(pianoWrapper);
  pianoWrapper.appendChild(piano);
  pianoWrapper.classList.add("pianoWrapper");

  function clickListener(_, ___, classes) {
    const measure = +classes
      .split(" ")
      .find((x) => x.startsWith("abcjs-mm"))
      .split("abcjs-mm")
      .at(-1);

    console.log(measure);
    console.log(midiBuffer);
    midiBuffer.seek(10, "seconds");
  }

  const visualObj = renderAbc(staff, data, {
    clickListener,
    responsive: "resize",
    add_classes: true,
  }).at(0);

  const hideMeter = visualObj.getMeter()?.value[0].den === "1";
  const hidePiano = typeof el.dataset.hidepiano !== "undefined";
  const hidePlayer = typeof el.dataset.hideplayer !== "undefined";

  if (hideMeter) {
    staff.querySelector(".abcjs-time-signature").style.display = "none";
  }

  let pianoController;
  if (!hidePiano) {
    pianoController = new Paino({
      el: piano,
      octaves: 5,
      startOctave: 2,
    });
    pianoController.render();
  } else {
    piano.remove();
  }

  if (hidePlayer) {
    audio.remove();
    return {};
  }

  if (!synth.supportsAudio()) {
    audio.innerHTML =
      "<div class='audio-error'>Audio is not supported in this browser.</div>";
    return;
  }

  const cursorControl = new CursorControl({
    index,
    el: staff,
    onNotesChange: (notes) => {
      pianoController?.setNotes(
        notes
          .filter(({ cmd }) => cmd === "note")
          .map(({ pitch }) => midiToNoteName(pitch)),
      );
    },
  });
  const synthControl = new synth.SynthController();
  synthControl.load(audio, cursorControl, {
    displayLoop: true,
    displayRestart: true,
    displayPlay: true,
    displayProgress: true,
    displayWarp: true,
  });
  const midiBuffer = new synth.CreateSynth();
  await midiBuffer.init({ visualObj });
  synthControl.setTune(visualObj, true);

  return { synthControl, cursorControl };
}

class CursorControl {
  constructor({ index, el, beatSubdivisions = 2, onNotesChange }) {
    this.index = index;
    this.el = el;
    this.beatSubdivisions = beatSubdivisions;
    this.onNotesChange = onNotesChange;
  }
  onPlayback(callback) {
    this._onPlayback = callback;
  }
  onStart() {
    if (!this.el.querySelector("svg .abcjs-cursor")) {
      this._createCursor();
    }
    if (!this._onPlayback) {
      return;
    }
    this._onPlayback(this.index);
  }
  onEvent(event) {
    if (event.measureStart && event.left === null) {
      return;
    }

    if (this.onNotesChange) {
      this.onNotesChange(event.midiPitches);
    }

    this.el
      .querySelectorAll("svg .highlight")
      .forEach((x) => x.classList.remove("highlight"));

    event.elements.forEach((x) =>
      x.forEach((y) => y.classList.add("highlight")),
    );

    const cursor = this.el.querySelector("svg .abcjs-cursor");
    if (!cursor) {
      return;
    }
    cursor.setAttribute("x1", event.left - 2);
    cursor.setAttribute("x2", event.left - 2);
    cursor.setAttribute("y1", event.top);
    cursor.setAttribute("y2", event.top + event.height);
  }
  onFinished() {
    if (this.onNotesChange) {
      this.onNotesChange([]);
    }
    this.el
      .querySelectorAll("svg .highlight")
      .forEach((x) => x.classList.remove("highlight"));
    const cursor = this.el.querySelector("svg .abcjs-cursor");
    if (!cursor) {
      return;
    }
    cursor.setAttribute("x1", 0);
    cursor.setAttribute("x2", 0);
    cursor.setAttribute("y1", 0);
    cursor.setAttribute("y2", 0);
  }
  _createCursor() {
    const cursor = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    cursor.setAttribute("class", "abcjs-cursor");
    cursor.setAttributeNS(null, "x1", 0);
    cursor.setAttributeNS(null, "y1", 0);
    cursor.setAttributeNS(null, "x2", 0);
    cursor.setAttributeNS(null, "y2", 0);
    this.el.querySelector("svg").appendChild(cursor);
  }
}
